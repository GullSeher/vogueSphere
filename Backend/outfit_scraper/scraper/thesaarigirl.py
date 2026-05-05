import json
import time
import requests
from io import BytesIO
from datetime import datetime, timedelta
from PIL import Image as PILImage
from bs4 import BeautifulSoup

import torch
from transformers import CLIPProcessor, CLIPModel

from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager

from supabase_helper import upload_scraped_data, download_json_from_bucket


# ===== SETTINGS =====
BUCKET_FILE = "The Saari Girl.json"
REFRESH_DAYS = 7
BUCKET_NAME = "scrape-data"

# ===== Label categories =====
CLOTHING_ITEMS = ["saree"]  # ✅ Fixed since this site sells only sarees

COLORS = [
    "red","blue","green","black","white","yellow","pink","purple","orange","brown","grey",
    "navy","maroon","beige","teal","gold","silver"
]

PATTERNS = [
    "striped","checked","polka dot","floral","plain","geometric","animal print","abstract","solid",
    "embroidered","printed","digital printed","floral print","tie-dye","ombre",
    "lace","sequined","beaded"
]

ALL_LABELS = CLOTHING_ITEMS + COLORS + PATTERNS


# ===== CLIP model load =====
device = "cuda" if torch.cuda.is_available() else "cpu"
clip_model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32").to(device)
processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")


def predict_labels(image_url):
    """Predict color and pattern for saree-only products."""
    try:
        response = requests.get(image_url, timeout=10)
        response.raise_for_status()
        image = PILImage.open(BytesIO(response.content)).convert("RGB")

        # Always start with "saree" as the fixed clothing item
        final_labels = ["saree"]

        def get_top_matches(label_list, topn=1):
            """Get top matches for color or pattern."""
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

        # ✅ Detect up to 2 colors
        colors_found = get_top_matches(COLORS, topn=2)
        final_labels.extend(colors_found)

        # ✅ Detect 1 pattern
        pattern_found = get_top_matches(PATTERNS, topn=1)
        final_labels.extend(pattern_found)

        return final_labels

    except Exception as e:
        print(f"⚠️ Error labeling image {image_url}: {e}")
        return ["saree", "unknown"]


def scrape_thesaarigirl():
    """Scrape TheSaariGirl ready-stitched saree collection with Supabase caching + CLIP labels."""
    # --- Check cache ---
    cached_data = download_json_from_bucket(BUCKET_NAME, BUCKET_FILE)
    if cached_data:
        cache_time = datetime.fromisoformat(cached_data.get("_cached_at"))
        if datetime.utcnow() - cache_time < timedelta(days=REFRESH_DAYS):
            print(f"📦 Using cached data from Supabase ({BUCKET_FILE})")
            return cached_data["products"]

    # --- Setup Selenium ---
    service = Service(ChromeDriverManager().install())
    options = webdriver.ChromeOptions()
    options.add_argument("--disable-gpu")
    options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_argument("user-agent=Mozilla/5.0")

    driver = webdriver.Chrome(service=service, options=options)
    url = "https://thesaarigirl.com/collections/barat-sarees"
    print(f"🌐 Opening: {url}")
    driver.get(url)

    # --- Scroll to load all products ---
    last_height = driver.execute_script("return document.body.scrollHeight")
    for _ in range(12):
        driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
        time.sleep(2)
        new_height = driver.execute_script("return document.body.scrollHeight")
        if new_height == last_height:
            break
        last_height = new_height

    # --- Wait for products to load ---
    try:
        WebDriverWait(driver, 15).until(
            EC.presence_of_all_elements_located((By.CLASS_NAME, "product-inner"))
        )
    except:
        print("⚠️ Timeout waiting for products.")

    soup = BeautifulSoup(driver.page_source, "html.parser")
    driver.quit()

    product_cards = soup.select("div.product-inner")
    print(f"🧩 Found {len(product_cards)} product cards")

    products = []
    seen_links = set()

    for card in product_cards:
        title_tag = card.select_one("h3.product-title a")
        if not title_tag:
            continue

        title = title_tag.get_text(strip=True)
        href = title_tag.get("href")
        link = "https://thesaarigirl.com" + href if href else None

        if href in seen_links:
            continue

        price_tag = card.select_one("span.price span.money")
        price = price_tag.get_text(strip=True) if price_tag else "No price"

        # --- Extract image ---
        image_div = card.select_one("div.main-img")
        image = None
        if image_div and "background-image" in image_div.get("style", ""):
            style = image_div["style"]
            image = style.split("url(")[-1].split(")")[0].strip('"\'')
            if image.startswith("//"):
                image = "https:" + image
            elif image.startswith("/"):
                image = "https://thesaarigirl.com" + image

        if not image:
            img_tag = card.find("img")
            if img_tag:
                image = img_tag.get("src") or img_tag.get("data-src")
                if image.startswith("//"):
                    image = "https:" + image
                elif image.startswith("/"):
                    image = "https://thesaarigirl.com" + image

        if not image:
            continue

        # --- Predict labels ---
        labels = predict_labels(image)

        products.append({
            "title": title,
            "price": price,
            "link": link,
            "image": image,
            "labels": labels
        })
        seen_links.add(href)

    # --- Upload to Supabase ---
    payload = {
        "_cached_at": datetime.utcnow().isoformat(),
        "products": products
    }
    upload_scraped_data(payload, BUCKET_NAME, BUCKET_FILE)
    print(f"✅ Uploaded {len(products)} saree products to Supabase: {BUCKET_FILE}")

    return products


if __name__ == "__main__":
    data = scrape_thesaarigirl()
    print(f"📝 Total products scraped: {len(data)}")
    for p in data[:5]:
        print(p)
