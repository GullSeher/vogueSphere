import time
import requests
from datetime import datetime, timedelta
from io import BytesIO
from PIL import Image as PILImage
from bs4 import BeautifulSoup

import torch
from transformers import CLIPProcessor, CLIPModel

from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By
from webdriver_manager.chrome import ChromeDriverManager

from supabase_helper import upload_scraped_data, download_json_from_bucket

# ===== SETTINGS =====
BUCKET_FILE = "Lulusar Skirts.json"
REFRESH_DAYS = 7
BUCKET_NAME = "scrape-data"

# ===== Label categories =====
CLOTHING_ITEMS = ["skirt","two piece skirt set","co-ord set","top and skirt"]
COLORS = [
    "red","blue","green","black","white","yellow","pink","purple","orange","brown","grey",
    "navy","maroon","beige","teal","gold","silver","light blue","dark blue","sky blue",
    "indigo","denim blue","olive","khaki","mustard","cream","off white","rust",
    "charcoal","mint","peach","lavender"
]
PATTERNS = [
    "striped","checked","polka dot","floral","plain","geometric",
    "animal print","abstract","solid","embroidered","printed",
    "digital printed","floral print","solid color","tie-dye","ombre"
]
ALL_LABELS = CLOTHING_ITEMS + COLORS + PATTERNS

# ===== CLIP MODEL =====
device = "cuda" if torch.cuda.is_available() else "cpu"
clip_model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32").to(device)
processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")

def predict_labels(image_url, title=""):
    try:
        r = requests.get(image_url, timeout=10)
        r.raise_for_status()
        image = PILImage.open(BytesIO(r.content)).convert("RGB")

        final_labels = []

        def get_top_matches(label_list, topn=1):
            inputs = processor(
                text=label_list,
                images=image,
                return_tensors="pt",
                padding=True
            ).to(device)
            with torch.no_grad():
                outputs = clip_model(**inputs)
                probs = outputs.logits_per_image.softmax(dim=1)
            top_indices = probs[0].topk(min(topn, len(label_list))).indices.tolist()
            return [label_list[i] for i in top_indices]

        final_labels.extend(get_top_matches(CLOTHING_ITEMS, topn=2))
        final_labels.extend(get_top_matches(COLORS, topn=2))
        final_labels.extend(get_top_matches(PATTERNS, topn=1))

        # Optional: always add clothing type from title
        title_lower = title.lower()
        if "co-ord" in title_lower or "set" in title_lower or "two piece" in title_lower:
            final_labels.insert(0, "two piece skirt set")
        else:
            final_labels.insert(0, "skirt")

        return list(dict.fromkeys(final_labels))  # remove duplicates

    except Exception as e:
        print(f"⚠ Error labeling image {image_url}: {e}")
        return ["skirt"]

def scrape_lulusar_skirts():
    """Scrape Lulusar skirts with Selenium + CLIP labels + Supabase caching."""
    cached_data = download_json_from_bucket(BUCKET_NAME, BUCKET_FILE)
    if cached_data:
        cache_time = datetime.fromisoformat(cached_data.get("_cached_at"))
        if datetime.utcnow() - cache_time < timedelta(days=REFRESH_DAYS):
            print(f"📅 Using cached data from Supabase ({BUCKET_FILE})")
            return cached_data["products"]

    service = Service(ChromeDriverManager().install())
    options = webdriver.ChromeOptions()
    options.add_argument("--headless=new")
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    driver = webdriver.Chrome(service=service, options=options)

    url = "https://www.lulusar.com/collections/skirts"
    print(f"📡 Opening URL: {url}")
    driver.get(url)
    time.sleep(5)

    # ---- Scroll to load all products ----
    last_height = driver.execute_script("return document.body.scrollHeight")
    while True:
        driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
        time.sleep(2)
        new_height = driver.execute_script("return document.body.scrollHeight")
        if new_height == last_height:
            break
        last_height = new_height

    soup = BeautifulSoup(driver.page_source, "html.parser")
    driver.quit()

    items = soup.find_all("div", class_="card-wrapper")
    print(f"🧩 Found {len(items)} products")

    products = []
    seen_images = set()
    base_url = "https://www.lulusar.com"

    for item in items:
        title_tag = item.find("a", class_="full-unstyled-link")
        title = title_tag.text.strip() if title_tag else "Unknown"

        brand_tag = item.find("div", class_="caption-with-letter-spacing")
        brand = brand_tag.text.strip() if brand_tag else ""

        price_tag = item.find("span", class_="money")
        price = price_tag.text.strip() if price_tag else "N/A"

        link = base_url + title_tag["href"] if title_tag else None

        img_tag = item.find("img")
        image = img_tag.get("src") if img_tag else None
        if image and image.startswith("//"):
            image = "https:" + image

        if image and image not in seen_images:
            labels = predict_labels(image, title)
            products.append({
                "title": title,
                "brand": brand,
                "price": price,
                "image": image,
                "link": link,
                "labels": labels
            })
            seen_images.add(image)

    payload = {
        "_cached_at": datetime.utcnow().isoformat(),
        "products": products
    }
    upload_scraped_data(payload, BUCKET_NAME, BUCKET_FILE)
    print(f"✅ Uploaded {len(products)} Lulusar products to Supabase: {BUCKET_FILE}")
    return products

# --------------------------
# Wrapper function for external import
# --------------------------
def get_lulusar_products():
    """Wrapper to match import style."""
    return scrape_lulusar_skirts()


# Optional test
if __name__ == "__main__":
    products = get_lulusar_products()
    print(f"📝 Total Lulusar products scraped: {len(products)}")
