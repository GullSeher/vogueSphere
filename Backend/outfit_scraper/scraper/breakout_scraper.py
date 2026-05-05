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
# SETTINGS
# --------------------------
CACHE_FILE_NAME = "Breakout.json"
BUCKET_NAME = "scrape-data"
REFRESH_DAYS = 7
BRAND_NAME = "breakout"

# --------------------------
# LABEL SETS
# --------------------------
CLOTHING_ITEMS = [
    # ===== JEANS / PANTS =====
    "skinny jeans", "straight jeans", "wide leg jeans", "bootcut jeans", "high waisted jeans",
    "ripped jeans", "cropped jeans", "jeans", "denims", "trousers", "pants",

    # ===== TOPS / SHIRTS =====
    "t-shirt", "casual shirt", "formal shirt", "tank top", "blouse", "collar shirt",
    "half sleeves shirt", "full sleeves shirt", "button down shirt", "top","sweatshirt",

    # ===== OUTERWEAR =====
    "hoodie", "sweater", "cardigan", "blazer", "jacket", "coat", "denim jacket",

    # ===== DRESSES / WOMEN WEAR =====
    "dress", "maxi dress", "bodycon dress", "shirt dress", "summer dress",
    "skirt", "jumpsuit", "romper", "frock", "western dress",
]

COLORS = [
    "black", "white", "blue", "light blue", "dark blue", "navy", "denim blue",
    "grey", "charcoal grey", "brown", "beige", "maroon", "green", "olive", "khaki",
    "red", "pink", "purple", "yellow", "orange", "teal", "gold", "silver"
]

PATTERNS = [
    "plain", "solid", "striped", "checked", "floral", "polka dot", "printed",
    "graphic print", "abstract", "animal print", "embroidered", "geometric"
]

ALL_LABELS = CLOTHING_ITEMS + COLORS + PATTERNS

# --------------------------
# LOAD CLIP MODEL
# --------------------------
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"🚀 Loading CLIP on {device}...")
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
# LABEL PREDICTION (CLIP + TEXT FILTER)
# --------------------------
def predict_labels(image_url, title):
    """
    Combines CLIP visual similarity + title keyword boosting.
    Returns: 1 clothing, 2 colors, 1 pattern
    """
    try:
        resp = requests.get(image_url, timeout=10)
        resp.raise_for_status()
        image = PILImage.open(BytesIO(resp.content)).convert("RGB")
        img_input = preprocess(image).unsqueeze(0).to(device)

        with torch.no_grad():
            img_features = clip_model.encode_image(img_input)
            img_features /= img_features.norm(dim=-1, keepdim=True)
            sims = (img_features @ text_features.T).squeeze(0)

            # --- Text-based boosting ---
            title_lower = title.lower()
            for i, label in enumerate(CLOTHING_ITEMS):
                if any(word in title_lower for word in label.split()):
                    sims[i] *= 1.15
            for i, color in enumerate(COLORS):
                if color in title_lower:
                    sims[idx_col_start + i] *= 1.2

            # --- Compute separate top matches ---
            clothing_sims = sims[idx_c_start:idx_c_end]
            color_sims = sims[idx_col_start:idx_col_end]
            pattern_sims = sims[idx_p_start:idx_p_end]

            clothing_idx = torch.argmax(clothing_sims).item()
            color_topk = torch.topk(color_sims, k=min(2, color_sims.shape[0]))
            pattern_idx = torch.argmax(pattern_sims).item()

            clothing_label = CLOTHING_ITEMS[clothing_idx]
            color_labels = [COLORS[i] for i in color_topk.indices.cpu().tolist()]
            pattern_label = PATTERNS[pattern_idx]

            return {
                "clothing": [clothing_label],
                "colors": color_labels,
                "patterns": [pattern_label]
            }

    except Exception as e:
        print(f"⚠️ Error predicting labels for {image_url}: {e}")
        return {"clothing": ["unknown"], "colors": ["unknown"], "patterns": ["unknown"]}

# --------------------------
# SCRAPER FUNCTION
# --------------------------
def scrape_breakout_women():
    options = webdriver.ChromeOptions()
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_argument("--headless")

    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=options)

    url = "https://breakout.com.pk/collections/women-uppers"
    print(f"📡 Opening: {url}")
    driver.get(url)
    time.sleep(5)

    # Scroll for lazy loading
    for _ in range(6):
        driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
        time.sleep(2)

    try:
        WebDriverWait(driver, 15).until(
            EC.presence_of_all_elements_located((By.CSS_SELECTOR, "div.grid-item.product-item"))
        )
    except:
        print("⚠️ Timeout waiting for products.")

    soup = BeautifulSoup(driver.page_source, "html.parser")
    driver.quit()

    items = soup.select("div.grid-item.product-item")
    print(f"🧩 Found {len(items)} product cards")

    products, seen = [], set()

    for item in items[:25]:  # ✅ Limit to 25
        img_tag = item.select_one("img")
        image = img_tag.get("src") or img_tag.get("data-src")
        if image:
            if image.startswith("//"):
                image = "https:" + image
            elif image.startswith("/"):
                image = "https://breakout.com.pk" + image

        title_tag = item.select_one("p.product-item__title")
        title = title_tag.get_text(strip=True) if title_tag else "Untitled Product"

        link_tag = item.find("a", href=True)
        link = link_tag["href"] if link_tag else None
        if link and not link.startswith("http"):
            link = "https://breakout.com.pk" + link

        # Extract price
        price_holder = item.select_one("div.product-item__price__holder")
        price = None
        if price_holder:
            new_price = price_holder.select_one("span.new-price")
            old_price = price_holder.select_one("span.old-price")
            price = (new_price or old_price).get_text(strip=True) if (new_price or old_price) else "N/A"

        if image and image not in seen:
            labels = predict_labels(image, title)
            all_labels = labels["clothing"] + labels["colors"] + labels["patterns"]
            products.append({
                "title": title,
                "image": image,
                "link": link,
                "price": price,
                "labels": all_labels
            })
            seen.add(image)

    print(f"✅ Scraped {len(products)} Breakout products with labels")
    return products

# --------------------------
# CACHE HANDLING (SUPABASE)
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
            print(f"⚠️ Cache read error: {e}")

    products = scrape_breakout_women()
    cache_json = {
        "last_scrape": datetime.now().isoformat(),
        "products": products
    }
    upload_scraped_data(cache_json, BUCKET_NAME, CACHE_FILE_NAME)
    print(f"✅ Uploaded new {BRAND_NAME} data to Supabase")
    return products

# --------------------------
# MAIN
# --------------------------
if __name__ == "__main__":
    products = get_products_with_supabase_cache()
    print(f"📝 Total {BRAND_NAME} products returned: {len(products)}")
