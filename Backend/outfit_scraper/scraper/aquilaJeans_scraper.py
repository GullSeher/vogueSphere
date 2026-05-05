import time
import requests
from io import BytesIO
from PIL import Image as PILImage
from bs4 import BeautifulSoup
from datetime import datetime, timedelta

import torch
import clip

from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager

from supabase_helper import upload_scraped_data, download_json_from_bucket

# --------------------------
# Settings
# --------------------------
BASE_URL = "https://aquila.pk"
CACHE_FILE_NAME = "Aquila.json"
BUCKET_NAME = "scrape-data"
REFRESH_DAYS = 7
BRAND_NAME = "aquila"

# --------------------------
# Labels
# --------------------------
CLOTHING_ITEMS = [
    # ===== JEANS TYPES =====
    "skinny jeans", "straight jeans", "wide leg jeans", "bootcut jeans", "high waisted jeans",
    "ripped jeans", "cropped jeans", "jeans", "denims",

    # ===== PANTS & TROUSERS =====
    "trousers", "pants",
]

COLORS = [
    # ===== BASIC COLORS =====
    "red", "blue", "green", "black", "white", "yellow",
    "pink", "purple", "orange", "brown", "grey",
    "navy", "maroon", "beige", "teal", "gold", "silver",

    # ===== JEANS / DENIM SHADES =====
    "denim blue", "light blue", "dark blue", "indigo", "washed black",
    "charcoal grey", "acid wash", "stone wash", "mid blue", "sky blue",
]

PATTERNS = [
    "striped", "checked", "polka dot", "floral",
    "plain", "geometric", "animal print", "abstract", "solid"
]

ALL_LABELS = CLOTHING_ITEMS + COLORS + PATTERNS

JEANS_KEYWORDS = ["jean", "denim", "pant", "trouser"]  # keywords for jeans-related filtering

# --------------------------
# Load CLIP
# --------------------------
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"Loading CLIP on {device}...")
clip_model, preprocess = clip.load("ViT-B/32", device=device)

with torch.no_grad():
    text_tokens = clip.tokenize(ALL_LABELS).to(device)
    text_features = clip_model.encode_text(text_tokens)
    text_features /= text_features.norm(dim=-1, keepdim=True)

# Index ranges
idx_c_start = 0
idx_c_end = len(CLOTHING_ITEMS)
idx_col_start = idx_c_end
idx_col_end = idx_col_start + len(COLORS)
idx_p_start = idx_col_end
idx_p_end = idx_p_start + len(PATTERNS)

# --------------------------
# Predict labels
# --------------------------
def predict_labels(image_url, topk_clothing=2, topk_colors=1, topk_patterns=1):
    try:
        resp = requests.get(image_url, timeout=10)
        resp.raise_for_status()
        image = PILImage.open(BytesIO(resp.content)).convert("RGB")
        img_input = preprocess(image).unsqueeze(0).to(device)

        with torch.no_grad():
            img_features = clip_model.encode_image(img_input)
            img_features /= img_features.norm(dim=-1, keepdim=True)
            sims = (img_features @ text_features.T).squeeze(0)

            # Bias non-jeans items lower
            for i, label in enumerate(CLOTHING_ITEMS):
                if not any(k in label.lower() for k in JEANS_KEYWORDS):
                    sims[i] *= 0.8  # reduce score for non-jeans items

            # Top clothing predictions
            clothing_sims = sims[idx_c_start:idx_c_end]
            clothing_topk = torch.topk(clothing_sims, k=min(topk_clothing, clothing_sims.shape[0]))
            clothing_labels = [CLOTHING_ITEMS[i] for i in clothing_topk.indices.cpu().tolist()]

            # Top color predictions
            color_sims = sims[idx_col_start:idx_col_end]
            color_topk = torch.topk(color_sims, k=min(topk_colors, color_sims.shape[0]))
            color_labels = [COLORS[i] for i in color_topk.indices.cpu().tolist()] or ["unknown"]

            # Top pattern predictions
            pattern_sims = sims[idx_p_start:idx_p_end]
            pattern_topk = torch.topk(pattern_sims, k=min(topk_patterns, pattern_sims.shape[0]))
            pattern_labels = [PATTERNS[i] for i in pattern_topk.indices.cpu().tolist()] or ["unknown"]

            return {
                "clothing": clothing_labels[:2],
                "colors": color_labels[:1],
                "patterns": pattern_labels[:1]
            }

    except Exception as e:
        print(f"⚠️ Error predicting labels for {image_url}: {e}")
        return {"clothing": ["unknown"], "colors": ["unknown"], "patterns": ["unknown"]}

# --------------------------
# Helper — check if product is jeans
# --------------------------
def is_jeans_product(title, labels):
    title_lower = title.lower()

    # ✅ 1. If title contains jeans keywords → keep
    if any(k in title_lower for k in JEANS_KEYWORDS):
        return True

    # ✅ 2. Or CLIP detected any jeans-type label → keep
    if any(any(k in lbl.lower() for k in JEANS_KEYWORDS) for lbl in labels["clothing"]):
        return True

    # Otherwise, skip (not jeans)
    return False


# --------------------------
# Scraper
# --------------------------
def scrape_aquila():
    options = webdriver.ChromeOptions()
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    options.add_argument("--headless=new")

    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=options)

    print(f"📡 Opening: {BASE_URL}")
    driver.get(BASE_URL)

    try:
        WebDriverWait(driver, 20).until(
            EC.presence_of_all_elements_located((By.CSS_SELECTOR, "div.product-card__info"))
        )
    except:
        print("⚠ Products did not load in time.")
        driver.quit()
        return []

    # Scroll for lazy loading
    last_h = driver.execute_script("return document.body.scrollHeight")
    while True:
        driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
        time.sleep(2)
        new_h = driver.execute_script("return document.body.scrollHeight")
        if new_h == last_h:
            break
        last_h = new_h

    time.sleep(1)
    soup = BeautifulSoup(driver.page_source, "html.parser")
    driver.quit()

    products = []
    seen = set()
    cards = soup.select("div.product-card__info")
    print(f"🧩 Found {len(cards)} product cards")

    for card in cards:
        title_tag = card.select_one("a.product-title")
        if not title_tag:
            continue

        title = title_tag.get_text(strip=True)
        link = BASE_URL + title_tag.get("href")

        # Price
        price = "N/A"
        try:
            sale_tag = card.select_one("sale-price")
            compare_tag = card.select_one("compare-at-price")
            if sale_tag:
                price = sale_tag.get_text(strip=True)
            elif compare_tag:
                price = compare_tag.get_text(strip=True)
            if price:
                price = price.replace("Sale price", "").replace("Regular price", "").strip()
        except:
            price = "N/A"

        # Image
        img_tag = card.find_previous("img", class_="product-card__image")
        image_url = img_tag.get("src") or img_tag.get("data-src") if img_tag else None
        if image_url and image_url.startswith("//"):
            image_url = "https:" + image_url

        if not image_url or image_url in seen:
            continue

        labels = predict_labels(image_url)

        # ✅ Skip non-jeans products
        if not is_jeans_product(title, labels):
            print(f"⏭ Skipping non-jeans product: {title}")
            continue

        all_labels = labels["clothing"] + labels["colors"] + labels["patterns"]
        products.append({
            "title": title,
            "image": image_url,
            "link": link,
            "price": price,
            "labels": all_labels
        })
        seen.add(image_url)

    print(f"✅ Scraped {len(products)} Aquila jeans products with labels")
    return products

# --------------------------
# Cache System (Supabase)
# --------------------------
def get_products_with_supabase_cache():
    cached_data = download_json_from_bucket(BUCKET_NAME, CACHE_FILE_NAME)
    if cached_data:
        try:
            last_scrape = datetime.fromisoformat(cached_data.get("last_scrape"))
            if datetime.now() - last_scrape < timedelta(days=REFRESH_DAYS):
                print(f"🗂 Using cached {BRAND_NAME} products (<{REFRESH_DAYS} days old)")
                return cached_data.get("products", [])
        except Exception as e:
            print(f"⚠️ Error reading last_scrape date: {e}")

    products = scrape_aquila()
    cache_json = {
        "last_scrape": datetime.now().isoformat(),
        "products": products
    }
    upload_scraped_data(cache_json, BUCKET_NAME, CACHE_FILE_NAME)
    print(f"✅ Uploaded new {BRAND_NAME} products to Supabase bucket")
    return products

# def get_aquila_jeans():
#     """Wrapper function for scraper handler."""
#     return get_products_with_supabase_cache()


# if __name__ == "__main__":
#     products = get_products_with_supabase_cache()
#     print(f"📝 Total {BRAND_NAME} products returned: {len(products)}")

# --------------------------
# Function for scraper handler
# --------------------------
def get_aquila_jeans():
    """Wrapper function for scraper handler."""
    return get_products_with_supabase_cache()


# Optional test
if __name__ == "__main__":
    products = get_aquila_jeans()
    print(f"📝 Total products scraped: {len(products)}")

