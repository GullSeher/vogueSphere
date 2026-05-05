# akgalleria.py

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
BUCKET_FILE = "Akgalleria Jumpsuits.json"
REFRESH_DAYS = 7
BUCKET_NAME = "scrape-data"

# ===== Label categories =====
CLOTHING_ITEMS = ["jumpsuit","playsuit"]
COLORS = ["red","blue","green","black","white","yellow","pink","purple","orange","brown","grey","beige","khaki"]
PATTERNS = ["solid","striped","checked","floral","printed","embroidered"]
ALL_LABELS = CLOTHING_ITEMS + COLORS + PATTERNS

# ===== CLIP model load =====
device = "cuda" if torch.cuda.is_available() else "cpu"
clip_model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32").to(device)
processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")

def predict_labels(image_url):
    try:
        response = requests.get(image_url, timeout=10)
        response.raise_for_status()
        image = PILImage.open(BytesIO(response.content)).convert("RGB")
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
        return final_labels

    except Exception as e:
        print(f"⚠ Error labeling image {image_url}: {e}")
        return ["unknown"]

def scrape_akgalleria():
    """Scrape AK Galleria women's jumpsuits/playsuits with Supabase caching + CLIP labels."""
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

    url = "https://akgalleria.com/collections/women-jumpsuits-playsuits"
    print(f"📡 Opening URL: {url}")
    driver.get(url)
    time.sleep(3)

    # Scroll to load more
    last_height = driver.execute_script("return document.body.scrollHeight")
    for _ in range(10):
        driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
        time.sleep(2)
        new_height = driver.execute_script("return document.body.scrollHeight")
        if new_height == last_height:
            break
        last_height = new_height

    try:
        WebDriverWait(driver, 15).until(
            EC.presence_of_all_elements_located((By.CSS_SELECTOR, "div.card.card--standard"))
        )
    except:
        print("⚠ Timeout waiting for products.")

    soup = BeautifulSoup(driver.page_source, "html.parser")
    driver.quit()

    items = soup.select("div.card.card--standard, div.baadmay-gateway-wrapper")
    print(f"🧩 AK Galleria product cards found: {len(items)}")

    products = []
    seen = set()
    base_url = "https://akgalleria.com"

    for item in items:
        h3_tag = item.select_one("h3.card__heading")
        if not h3_tag:
            continue
        a_tag = h3_tag.select_one("a")
        title = a_tag.get_text(strip=True) if a_tag else h3_tag.get_text(strip=True)

        href_tag = item.select_one("a.card-link, a.full-unstyled-link")
        href = href_tag.get("href") if href_tag else None
        full_link = base_url + href if href else None

        img_tag = item.select_one("div.card__media img")
        image = img_tag.get("src") or img_tag.get("data-src") if img_tag else None
        if image and image.startswith("//"):
            image = "https:" + image

        price = "Price not found"
        sale_tag = item.select_one(".price-item--sale .money")
        regular_tag = item.select_one(".price-item--regular .money")
        if sale_tag:
            price = sale_tag.get_text(strip=True)
        elif regular_tag:
            price = regular_tag.get_text(strip=True)

        if image and image not in seen:
            labels = predict_labels(image)
            products.append({
                "title": title,
                "image": image,
                "link": full_link,
                "price": price,
                "labels": labels
            })
            seen.add(image)

    payload = {
        "_cached_at": datetime.utcnow().isoformat(),
        "products": products
    }
    upload_scraped_data(payload, BUCKET_NAME, BUCKET_FILE)
    print(f"✅ Uploaded {len(products)} AK Galleria products to Supabase: {BUCKET_FILE}")
    return products

# ===== Function for scraper handler =====
def get_akgalleria_products():
    """Wrapper function for scraper handler."""
    return scrape_akgalleria()


# Optional: test
if __name__ == "__main__":
    products = get_akgalleria_products()
    print(f"📝 Total products scraped: {len(products)}")
