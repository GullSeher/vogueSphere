import time
import requests
import json
from io import BytesIO
from datetime import datetime, timedelta
from bs4 import BeautifulSoup
from supabase_helper import upload_scraped_data, download_json_from_bucket

import torch
import clip
from PIL import Image as PILImage
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager

# --- Label categories ---
CLOTHING_ITEMS = [
    # Eastern wear
    "embroidered shalwar kameez", "printed kurti", "2 piece dress", "3 piece dress",
    "ready to wear", "party wear", "maxi dress", "dress",
    "kurta", "shalwar kameez", "frock", "shalwar kameez with duppata"
]

COLORS = [
    "red", "blue", "green", "black", "white", "yellow", "pink", "purple", "orange", "brown", "grey",
    "navy", "maroon", "beige", "teal", "gold", "silver",
    "light blue", "dark blue", "sky blue", "indigo", "denim blue",
    "olive", "khaki", "mustard", "cream", "off white", "rust",
    "charcoal", "mint", "peach", "lavender"
]

PATTERNS = [
    "striped", "checked", "polka dot", "floral", "plain", "geometric",
    "animal print", "abstract", "solid", "embroidered", "printed",
    "digital printed", "floral print", "solid color", "tie-dye", "ombre"
]

ALL_LABELS = CLOTHING_ITEMS + COLORS + PATTERNS

# --- Cache settings ---
CACHE_FILE_NAME = "khaadi.json"
BUCKET_NAME = "scrape-data"
REFRESH_DAYS = 7

# --- CLIP Model ---
device = "cuda" if torch.cuda.is_available() else "cpu"
clip_model, preprocess = clip.load("ViT-B/32", device=device)
text_tokens = clip.tokenize(ALL_LABELS).to(device)
with torch.no_grad():
    text_features = clip_model.encode_text(text_tokens)
    text_features /= text_features.norm(dim=-1, keepdim=True)

# --- CLIP labeling ---
def label_image_multi(image_url):
    """Label image using CLIP — returns 2 clothing, 2 color, 1 pattern"""
    try:
        r = requests.get(image_url, timeout=10)
        img = PILImage.open(BytesIO(r.content)).convert("RGB")
        img_input = preprocess(img).unsqueeze(0).to(device)

        with torch.no_grad():
            img_features = clip_model.encode_image(img_input)
            img_features /= img_features.norm(dim=-1, keepdim=True)
            similarity = (100.0 * img_features @ text_features.T).softmax(dim=-1)[0]

        sorted_indices = similarity.argsort(descending=True).cpu().numpy()
        labels_sorted = [ALL_LABELS[i] for i in sorted_indices]

        clothing = [l for l in labels_sorted if l in CLOTHING_ITEMS][:2]
        colors = [l for l in labels_sorted if l in COLORS][:2]
        pattern = [l for l in labels_sorted if l in PATTERNS][:1]

        return list(dict.fromkeys(clothing + colors + pattern))
    except Exception as e:
        print(f"⚠ Error labeling {image_url}: {e}")
        return ["unknown"]

# --- Text-based labeling ---
def label_from_text(text):
    """Extract labels from title + brand text"""
    text_lower = text.lower()
    clothing = [item for item in CLOTHING_ITEMS if item in text_lower][:2]
    colors = [c for c in COLORS if c in text_lower][:2]
    patterns = [p for p in PATTERNS if p in text_lower][:1]
    return list(dict.fromkeys(clothing + colors + patterns))

# --- Scraper ---
def scrape_khaadi():
    service = Service(ChromeDriverManager().install())
    options = webdriver.ChromeOptions()
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_argument("--headless")

    driver = webdriver.Chrome(service=service, options=options)
    url = "https://pk.khaadi.com/new-in/"
    print(f"📡 Opening: {url}")
    driver.get(url)
    time.sleep(5)

    # scroll
    last_height = driver.execute_script("return document.body.scrollHeight")
    while True:
        driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
        time.sleep(2)
        new_height = driver.execute_script("return document.body.scrollHeight")
        if new_height == last_height:
            break
        last_height = new_height
    time.sleep(2)

    soup = BeautifulSoup(driver.page_source, "html.parser")
    driver.quit()

    items = soup.find_all("div", class_="tile-body")
    print(f"🧩 Found {len(items)} products")

    products, seen = [], set()
    base_url = "https://pk.khaadi.com"

    for item in items:
        # --- Title ---
        title_tag = item.find("h2", class_="pdp-link-heading")
        title = title_tag.text.strip() if title_tag else "Unknown"

        # --- Image ---
        img_tag = item.find_previous("img", class_="card-img-top")
        image = img_tag.get("src") if img_tag else None
        if image and image.startswith("//"):
            image = "https:" + image

        # --- Link ---
        link_tag = item.find("a", class_="link plpRedirectPdp")
        link = base_url + link_tag["href"] if link_tag else None

        # --- Price ---
        price_tag = item.find("span", class_="value cc-price")
        price = price_tag.text.strip() if price_tag else "N/A"

        # --- Brand/Pattern Text ---
        brand_tag = item.find("div", class_="product-brand")
        brand_text = brand_tag.text.strip() if brand_tag else ""
        # Extract first part (before '|') as pattern keyword
        if "|" in brand_text:
            pattern_hint = brand_text.split("|")[0].strip()
        else:
            pattern_hint = brand_text.strip()

        if title and image and link and image not in seen:
            # 🔹 CLIP-based labels
            clip_labels = label_image_multi(image)

            # 🔹 Text-based labels (title + pattern hint)
            text_labels = label_from_text(title + " " + pattern_hint)

            # 🔹 Merge and limit total (2 clothing + 2 color + 1 pattern)
            all_labels = list(dict.fromkeys(clip_labels + text_labels))

            # Enforce limits in correct order
            final_clothing = [l for l in all_labels if l in CLOTHING_ITEMS][:2]
            final_colors = [l for l in all_labels if l in COLORS][:2]
            final_pattern = [l for l in all_labels if l in PATTERNS][:1]

            final_labels = final_clothing + final_colors + final_pattern

            products.append({
                "title": title,
                "price": price,
                "image": image,
                "link": link,
                "labels": final_labels
            })
            seen.add(image)

    return products

# --- Cache Handler ---
def get_khaadi_products():
    cached_data = download_json_from_bucket(BUCKET_NAME, CACHE_FILE_NAME)
    if cached_data:
        last_scrape = datetime.fromisoformat(cached_data.get("last_scrape"))
        if datetime.now() - last_scrape < timedelta(days=REFRESH_DAYS):
            print("🗂 Using cached Khaadi products (<7 days old)")
            return cached_data.get("products", [])

    products = scrape_khaadi()
    cache_json = {
        "last_scrape": datetime.now().isoformat(),
        "products": products
    }
    upload_scraped_data(cache_json, BUCKET_NAME, CACHE_FILE_NAME)
    print(f"✅ Uploaded to Supabase: {CACHE_FILE_NAME}")
    return products

# --- Run ---
if __name__ == "__main__":
    products = get_khaadi_products()
    print(f"📝 Total Khaadi products returned: {len(products)}")
