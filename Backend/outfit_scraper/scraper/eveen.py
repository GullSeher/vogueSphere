import time
import json
from datetime import datetime, timedelta
from io import BytesIO
from PIL import Image as PILImage
from bs4 import BeautifulSoup

import torch
import clip
import requests

from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager

from supabase_helper import upload_scraped_data, download_json_from_bucket

# ===== SETTINGS =====
BUCKET_FILE = "Eveen Hoodie.json"
REFRESH_DAYS = 7
BUCKET_NAME = "scrape-data"

# ===== Label categories =====
CLOTHING_LABELS = ["hoodie", "sweatshirt", "jacket", "zipper hoodie", "pullover", "crewneck"]
PATTERN_LABELS = ["plain", "striped", "polka dot", "printed", "embroidered", "graphic"]
COLOR_LABELS = ["red", "blue", "green", "yellow", "black", "white", "pink", "orange", "purple", "grey", "brown", "beige"]
ALL_LABELS = CLOTHING_LABELS + PATTERN_LABELS + COLOR_LABELS

# ===== CLIP model load =====
device = "cuda" if torch.cuda.is_available() else "cpu"
model, preprocess = clip.load("ViT-B/32", device=device)

def predict_labels(image_url, title=""):
    """Predict top 5 labels for image using CLIP."""
    try:
        response = requests.get(image_url, timeout=10)
        response.raise_for_status()
        image = PILImage.open(BytesIO(response.content)).convert("RGB")
        image_input = preprocess(image).unsqueeze(0).to(device)

        text_inputs = torch.cat([clip.tokenize(label) for label in ALL_LABELS]).to(device)
        with torch.no_grad():
            image_features = model.encode_image(image_input)
            text_features = model.encode_text(text_inputs)
            similarities = (image_features @ text_features.T).squeeze(0)
            top_indices = similarities.softmax(dim=0).topk(5).indices.cpu().numpy()
        labels = [ALL_LABELS[i] for i in top_indices]
        return labels
    except Exception as e:
        print(f"⚠ Error labeling {title}: {e}")
        return ["unknown"]

def scrape_eveen():
    """Scrape Eveen hoodies with caching, CLIP labels, and Supabase upload."""
    # --- Check cache ---
    cached_data = download_json_from_bucket(BUCKET_NAME, BUCKET_FILE)
    if cached_data:
        cache_time = datetime.fromisoformat(cached_data.get("_cached_at"))
        if datetime.utcnow() - cache_time < timedelta(days=REFRESH_DAYS):
            print(f"📅 Using cached data from Supabase ({BUCKET_FILE})")
            return cached_data["products"]

    # --- Selenium setup ---
    service = Service(ChromeDriverManager().install())
    options = webdriver.ChromeOptions()
    options.add_argument("--headless=new")
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    driver = webdriver.Chrome(service=service, options=options)

    url = "https://eveen.pk/collections/hoodie"
    print(f"📡 Opening URL: {url}")
    driver.get(url)
    time.sleep(3)

    # --- Scroll to load more products ---
    last_height = driver.execute_script("return document.body.scrollHeight")
    for _ in range(10):
        driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
        time.sleep(2)
        new_height = driver.execute_script("return document.body.scrollHeight")
        if new_height == last_height:
            break
        last_height = new_height

    soup = BeautifulSoup(driver.page_source, "html.parser")
    driver.quit()

    items = soup.select("section.product-card")
    print(f"🧩 Found {len(items)} products")

    products = []
    seen_images = set()
    base_url = "https://eveen.pk"

    for item in items:
        # Title and link
        title_tag = item.select_one("h3.product-card_title a")
        title = title_tag.get_text(strip=True) if title_tag else "Untitled"
        link = base_url + title_tag["href"] if title_tag else None

        # Image
        img_tag = item.select_one("img.lazyloaded, img.lazyload, img")
        image = None
        if img_tag:
            srcset = img_tag.get("data-srcset") or img_tag.get("srcset") or img_tag.get("src")
            if srcset:
                image = srcset.split(",")[-1].split()[0]
                if image.startswith("//"):
                    image = "https:" + image

        # Price
        price_tag = item.select_one(".product-card_price_action .price, .product-price .price")
        price = price_tag.get_text(strip=True) if price_tag else "N/A"

        # Skip duplicates
        if image and image not in seen_images:
            labels = predict_labels(image, title)
            products.append({
                "title": title,
                "link": link,
                "image": image,
                "price": price,
                "labels": labels
            })
            seen_images.add(image)

    # --- Upload to Supabase ---
    payload = {
        "_cached_at": datetime.utcnow().isoformat(),
        "products": products
    }
    upload_scraped_data(payload, BUCKET_NAME, BUCKET_FILE)
    print(f"✅ Uploaded {len(products)} Eveen products to Supabase: {BUCKET_FILE}")
    return products

# if __name__ == "__main__":
#     scraped_products = scrape_eveen()
#     print(f"📝 Total products scraped: {len(scraped_products)}")

# --------------------------
# Function for scraper handler
# --------------------------
def get_eveen_products():
    """Wrapper function for scraper handler."""
    return scrape_eveen()


# Optional test
if __name__ == "__main__":
    products = get_eveen_products()
    print(f"📝 Total Eveen products scraped: {len(products)}")
