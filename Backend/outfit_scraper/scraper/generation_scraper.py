import time
import requests
from io import BytesIO
from datetime import datetime, timedelta
from bs4 import BeautifulSoup
from supabase_helper import upload_scraped_data, download_json_from_bucket

import torch
import clip
from PIL import Image as PILImage, UnidentifiedImageError
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager   # ✅ Auto Driver Manager

CLOTHING_ITEMS = [
    # generation-specific tops & eastern wear
    "kurta", "kurti", "embroidered top", "printed top", "casual top", "blouse", "tunic", "top"
    "shirt", "long top", "frock top", "sleeveless top", "formal top", "embroidered kurta", "embroidered shirt",
    "ready to wear"
]

COLORS = [
    "red", "blue", "green", "black", "white", "yellow", "pink", "purple", "orange", "brown", "grey",
    "navy", "maroon", "beige", "teal", "gold", "silver",
    "light blue", "dark blue", "sky blue", "indigo", "olive", "cream", "off white", "peach", "lavender"
]

PATTERNS = [
    "embroidered", "printed", "floral", "plain", "striped", "checked", "digital printed", "geometric",
    "solid", "tie-dye", "ombre"
]
ALL_LABELS = CLOTHING_ITEMS + COLORS + PATTERNS

CACHE_FILE_NAME = "Generation.json"
BUCKET_NAME = "scrape-data"
REFRESH_DAYS = 7

# --- Load CLIP model once ---
device = "cuda" if torch.cuda.is_available() else "cpu"
clip_model, preprocess = clip.load("ViT-B/32", device=device)
text_tokens = clip.tokenize(ALL_LABELS).to(device)
with torch.no_grad():
    text_features = clip_model.encode_text(text_tokens)
    text_features /= text_features.norm(dim=-1, keepdim=True)


# --- Predict labels ---
def predict_labels(image_url):
    try:
        response = requests.get(image_url, timeout=10)
        image = PILImage.open(BytesIO(response.content)).convert("RGB")
        image_input = preprocess(image).unsqueeze(0).to(device)

        with torch.no_grad():
            image_features = clip_model.encode_image(image_input)
            image_features /= image_features.norm(dim=-1, keepdim=True)
            similarity = (100.0 * image_features @ text_features.T).softmax(dim=-1)

        sorted_indices = similarity[0].argsort(descending=True).tolist()
        clothing, colors, patterns = [], [], []

        for idx in sorted_indices:
            label = ALL_LABELS[idx]
            if label in CLOTHING_ITEMS and len(clothing) < 2:
                clothing.append(label)
            elif label in PATTERNS and len(patterns) < 1:
                patterns.append(label)
            elif label in COLORS and len(colors) < 1:
                colors.append(label)

            if len(clothing) >= 2 and len(patterns) >= 1 and len(colors) >= 1:
                break

        return {
            "clothing": clothing,
            "patterns": patterns,
            "colors": colors
        }

    except (UnidentifiedImageError, Exception) as e:
        print(f"⚠️ Skipping invalid image {image_url}: {e}")
        return {
            "clothing": [],
            "patterns": [],
            "colors": []
        }


# --- Scrape Generation ---
def scrape_generation():
    # ✅ Auto ChromeDriver (no manual path needed)
    service = Service(ChromeDriverManager().install())
    options = webdriver.ChromeOptions()
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_argument("--headless")

    driver = webdriver.Chrome(service=service, options=options)
    url = "https://generation.com.pk/collections/tops"
    print("📡 Opening:", url)
    driver.get(url)
    time.sleep(5)

    # Auto-scroll to load all products
    last_h = driver.execute_script("return document.body.scrollHeight")
    while True:
        driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
        time.sleep(2)
        new_h = driver.execute_script("return document.body.scrollHeight")
        if new_h == last_h:
            break
        last_h = new_h
    time.sleep(2)

    soup = BeautifulSoup(driver.page_source, "html.parser")
    driver.quit()

    items = soup.select("div.ProductItem__Wrapper")
    print(f"🧩 Generation product cards found: {len(items)}")

    products = []
    seen = set()

    for item in items:
        title_tag = item.select_one("h2.ProductItem__Title a")
        title = title_tag.get_text(strip=True) if title_tag else "Untitled"
        link = "https://generation.com.pk" + title_tag["href"] if title_tag else None

        img_tag = item.select_one("img.ProductItem__Image")
        image = None
        if img_tag:
            srcset = img_tag.get("data-srcset") or img_tag.get("srcset")
            if srcset:
                image = srcset.split(",")[0].split(" ")[0]
            else:
                image = img_tag.get("data-src") or img_tag.get("src")

            # Skip placeholders
            if image and image.startswith("data:image"):
                image = None

            # Fix relative URLs
            if image:
                if image.startswith("//"):
                    image = "https:" + image
                elif not image.startswith("http"):
                    image = "https://generation.com.pk" + image

            # Remove `{width}x` placeholders
            if image:
                image = image.replace("_{width}x", "")

        price_tag = item.select_one("span.ProductItem__Price")
        price = price_tag.get_text(strip=True) if price_tag else "N/A"

        if image and image not in seen:
            labels = predict_labels(image)
            all_labels = labels["clothing"] + labels["colors"] + labels["patterns"]
            
            products.append({
                "title": title,
                "image": image,
                "link": link,
                "price": price,
                "labels": all_labels
            })
            seen.add(image)

    return products


# --- Supabase cache wrapper ---
def get_generation_products():
    cached_data = download_json_from_bucket(BUCKET_NAME, CACHE_FILE_NAME)
    if cached_data:
        last_scrape = datetime.fromisoformat(cached_data.get("last_scrape"))
        if datetime.now() - last_scrape < timedelta(days=REFRESH_DAYS):
            print("🗂 Using cached Generation products (less than 7 days old)")
            return cached_data.get("products", [])

    products = scrape_generation()

    cache_json = {
        "last_scrape": datetime.now().isoformat(),
        "products": products
    }
    upload_scraped_data(cache_json, BUCKET_NAME, CACHE_FILE_NAME)
    print(f"✅ Uploaded to Supabase: {CACHE_FILE_NAME}")
    return products


if __name__ == "__main__":
    products = get_generation_products()
    print(f"📝 Total Generation products returned: {len(products)}")
