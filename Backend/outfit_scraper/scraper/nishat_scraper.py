import time
from datetime import datetime, timedelta
from supabase_helper import upload_scraped_data, download_json_from_bucket

from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager

import requests
from io import BytesIO
from PIL import Image as PILImage, UnidentifiedImageError
import torch
import clip

# ======== CATEGORY LABELS ========
CLOTHING_ITEMS = [
    "skinny jeans", "straight jeans", "wide leg jeans", "bootcut jeans", "high waisted jeans",
    "ripped jeans", "cropped jeans", "jeans", "denims",
    "trousers", "pants"
]

COLORS = [
    "red", "blue", "green", "black", "white", "yellow",
    "pink", "purple", "orange", "brown", "grey",
    "navy", "maroon", "beige", "teal", "gold", "silver",
    "denim blue", "light blue", "dark blue", "indigo", "washed black",
    "charcoal grey", "acid wash", "stone wash", "mid blue", "sky blue",
]

PATTERNS = [
    "striped", "checked", "polka dot", "floral",
    "plain", "geometric", "animal print", "abstract", "solid"
]

ALL_LABELS = CLOTHING_ITEMS + COLORS + PATTERNS

# ======== CONFIG ========
CACHE_FILE_NAME = "Nishat Pants.json"
BUCKET_NAME = "scrape-data"
REFRESH_DAYS = 7

# ======== LOAD CLIP MODEL ========
device = "cuda" if torch.cuda.is_available() else "cpu"
clip_model, preprocess = clip.load("ViT-B/32", device=device)
text_tokens = clip.tokenize(ALL_LABELS).to(device)
with torch.no_grad():
    text_features = clip_model.encode_text(text_tokens)
    text_features /= text_features.norm(dim=-1, keepdim=True)

# ======== LABELING (CLIP + TEXT FALLBACK) ========
def label_image_multi(image_url, title=None):
    clothing, pattern, color = [], [], []

    try:
        if image_url and not image_url.startswith("data:image"):
            response = requests.get(image_url, timeout=10)
            img = PILImage.open(BytesIO(response.content)).convert("RGB")

            img_input = preprocess(img).unsqueeze(0).to(device)
            with torch.no_grad():
                img_features = clip_model.encode_image(img_input)
                img_features /= img_features.norm(dim=-1, keepdim=True)
                similarity = (100.0 * img_features @ text_features.T).softmax(dim=-1)[0]

            sorted_indices = similarity.argsort(descending=True).cpu().numpy()
            labels_sorted = [ALL_LABELS[i] for i in sorted_indices]

            clothing = [l for l in labels_sorted if l in CLOTHING_ITEMS][:2]
            pattern = [l for l in labels_sorted if l in PATTERNS][:1]
            color = [l for l in labels_sorted if l in COLORS][:1]

    except (requests.RequestException, UnidentifiedImageError, Exception):
        pass

    # Fallback: text matching
    if title:
        title_lower = title.lower()
        if not clothing:
            clothing = [c for c in CLOTHING_ITEMS if c in title_lower][:2]
        if not pattern:
            pattern = [p for p in PATTERNS if p in title_lower][:1]
        if not color:
            color = [c for c in COLORS if c in title_lower][:1]

    if not (clothing or pattern or color):
        return ["unknown"]

    return clothing + pattern + color

# ======== SCRAPER FUNCTION ========
def scrape_nishat_pants():
    options = webdriver.ChromeOptions()
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_argument("--headless")

    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)
    url = "https://nishatlinen.com/collections/pants"
    print(f"📡 Opening: {url}")
    driver.get(url)
    time.sleep(3)

    # Scroll to load all products
    SCROLL_PAUSE = 1.5
    last_height = driver.execute_script("return document.body.scrollHeight")
    while True:
        driver.execute_script("window.scrollBy(0, 800);")
        time.sleep(SCROLL_PAUSE)
        new_height = driver.execute_script("return document.body.scrollHeight")
        if new_height == last_height:
            break
        last_height = new_height
    time.sleep(2)

    try:
        WebDriverWait(driver, 10).until(
            EC.presence_of_all_elements_located((By.CSS_SELECTOR, "div.t4s-product-wrapper"))
        )
    except:
        print("⚠ Timeout waiting for products")

    product_cards = driver.find_elements(By.CSS_SELECTOR, "div.t4s-product-wrapper")
    print(f"🔍 Found {len(product_cards)} product cards")

    products = []
    seen_links = set()

    for card in product_cards:
        try:
            title = card.find_element(By.CSS_SELECTOR, "h3.t4s-product-title a").text.strip()
        except:
            title = "No Title"

        try:
            price = card.find_element(By.CSS_SELECTOR, ".t4s-product-price .money").text.strip()
        except:
            price = "Price not found"

        try:
            href = card.find_element(By.CSS_SELECTOR, "a.t4s-full-width-link").get_attribute("href")
            if not href or href in seen_links:
                continue
            seen_links.add(href)
        except:
            href = None

        # Image URL
        img_url = None
        try:
            img_tag = card.find_element(By.CSS_SELECTOR, "img.t4s-product-main-img")
            img_url = (
                img_tag.get_attribute("currentSrc")
                or img_tag.get_attribute("data-src")
                or img_tag.get_attribute("data-lazy-src")
                or img_tag.get_attribute("src")
            )
            if img_url and img_url.startswith("data:image"):
                img_url = None
        except:
            img_url = None

        # Secondary selector
        if not img_url:
            try:
                img_tag_alt = card.find_element(By.CSS_SELECTOR, "img.t4s-product-img")
                img_url = img_tag_alt.get_attribute("src") or img_tag_alt.get_attribute("data-src")
            except:
                img_url = None

        # Skip invalid images
        if not img_url:
            print(f"⚠ Skipping '{title}' because image is missing or invalid")
            continue

        labels = label_image_multi(img_url, title)

        products.append({
            "title": title,
            "price": price,
            "image": img_url,
            "link": href,
            "labels": labels
        })

        if len(products) >= 8:
            break

    driver.quit()
    return products

# ======== SUPABASE CACHE MANAGEMENT ========
def get_nishat_pants():
    cached_data = download_json_from_bucket(BUCKET_NAME, CACHE_FILE_NAME)
    old_products = cached_data.get("products", []) if cached_data else []
    old_links = {p["link"] for p in old_products}

    last_scrape = None
    if cached_data and "last_scrape" in cached_data:
        last_scrape = datetime.fromisoformat(cached_data["last_scrape"])

    # Use cache if recent
    if last_scrape and datetime.now() - last_scrape < timedelta(days=REFRESH_DAYS):
        print(f"🗂 Using cached Nishat products (<{REFRESH_DAYS} days old)")
        return old_products

    new_products = scrape_nishat_pants()
    merged_products = old_products.copy()
    for product in new_products:
        if product["link"] not in old_links:
            merged_products.append(product)

    cache_json = {
        "last_scrape": datetime.now().isoformat(),
        "products": merged_products
    }

    upload_scraped_data(cache_json, BUCKET_NAME, CACHE_FILE_NAME)
    print(f"✅ Supabase updated: {len(new_products)} new, {len(merged_products)} total products")
    return merged_products

# ======== MAIN RUN ========
if __name__ == "__main__":
    products = get_nishat_pants()
    print(f"📝 Total Nishat products returned: {len(products)}")
