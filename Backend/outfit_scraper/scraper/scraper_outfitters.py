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
from webdriver_manager.chrome import ChromeDriverManager  # ✅ auto driver

from supabase_helper import upload_scraped_data, download_json_from_bucket

# ===== SETTINGS =====
BUCKET_FILE = "outfitters.json"
REFRESH_DAYS = 7
BUCKET_NAME = "scrape-data"

# ===== Label categories =====
CLOTHING_ITEMS = [
    "skinny jeans", "straight jeans", "wide leg jeans", "bootcut jeans", "high waisted jeans",
    "denim jacket", "denim skirt", "ripped jeans", "cropped jeans",
    "t-shirt", "casual shirt", "formal shirt", "tank top", "hoodie", "sweater", "blazer", "jacket", "coat",
    "trousers", "pants", "shorts", "tops",
    "embroidered shalwar kameez", "printed kurti", "plain suit", "2 piece dress", "3 piece dress",
    "ready to wear", "party wear", "maxi dress", "dress", "skirt", "romper", "jumpsuit",
    "casual top", "blouse", "jeans", "denims", "leggings",
    "western dress", "bodycon dress", "shirt dress", "summer dress",
    "cardigan", 
    "kurta", "shalwar kameez", "frock", "wedding dress",
    "lehenga", "lehenga choli", "bridal lehenga", "anarkali dress",
    "floor length gown", "sharara suit", "gharara suit", "angrakha style dress",
    "long kameez with lehenga", "formal frock", "party wear dress",
    "embroidered wedding dress", "designer wedding gown",
    "collar shirt", "half sleeves shirt", "full sleeves shirt"
]

COLORS = [
    "red","blue","green","black","white","yellow","pink","purple","orange","brown","grey",
    "navy","maroon","beige","teal","gold","silver"
]
PATTERNS = [
    "striped","checked","polka dot","floral","plain","geometric","animal print","abstract","solid",
    "embroidered", "printed", "digital printed", "floral print",
    "solid color", "tie-dye", "ombre","lace", "sequined", "beaded"
]

ALL_LABELS = CLOTHING_ITEMS + COLORS + PATTERNS

# ===== CLIP model load =====
device = "cuda" if torch.cuda.is_available() else "cpu"
clip_model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32").to(device)
processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")

def predict_labels(image_url):
    """Predict at least 2 clothing types, multiple colors, and exactly 1 pattern."""
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

        # At least 2 clothing types
        clothing_found = get_top_matches(CLOTHING_ITEMS, topn=2)
        final_labels.extend(clothing_found)

        # Up to 2 colors
        color_found = get_top_matches(COLORS, topn=2)
        final_labels.extend(color_found)

        # Exactly 1 pattern
        pattern_found = get_top_matches(PATTERNS, topn=1)
        final_labels.extend(pattern_found)

        return final_labels

    except Exception as e:
        print(f"⚠ Error labeling image {image_url}: {e}")
        return ["unknown"]

def scrape_outfitters():
    """Scrape Outfitters new arrivals with Supabase caching + CLIP labels."""
    cached_data = download_json_from_bucket(BUCKET_NAME, BUCKET_FILE)
    if cached_data:
        cache_time = datetime.fromisoformat(cached_data.get("_cached_at"))
        if datetime.utcnow() - cache_time < timedelta(days=REFRESH_DAYS):
            print(f"📅 Using cached data from Supabase ({BUCKET_FILE})")
            return cached_data["products"]

    # ✅ Auto ChromeDriver setup
    service = Service(ChromeDriverManager().install())
    options = webdriver.ChromeOptions()
    options.add_argument("--headless=new")  # modern headless mode
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-blink-features=AutomationControlled")
    driver = webdriver.Chrome(service=service, options=options)

    url = "https://outfitters.com.pk/collections/women-new-arrivals-view-all?constraint=shirts"
    print(f"📡 Opening URL: {url}")
    driver.get(url)

    # Scroll to load more products
    last_height = driver.execute_script("return document.body.scrollHeight")
    for _ in range(12):
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

    items = soup.select("div.card.card--standard")
    print(f"🧩 Outfitters product cards found: {len(items)}")

    products = []
    seen = set()
    base_url = "https://outfitters.com.pk"

    for item in items:
        title_tag = item.select_one("h3.card__heading.h5 a")
        if not title_tag:
            continue

        title = title_tag.get("aria-label") or title_tag.get_text(strip=True)
        href = title_tag.get("href")
        if not title or not href:
            continue
        full_link = base_url + href.strip()

        media_div = item.select_one("div.card__media")
        image = None
        if media_div:
            img_tag = media_div.find("img")
            if img_tag:
                image = img_tag.get("data-src") or img_tag.get("src")
        if image and image.startswith("//"):
            image = "https:" + image

        price = "Price not found"
        price_container = item.select_one("div.price__container")
        if price_container:
            sale_price = price_container.select_one(".price-item--sale .money")
            regular_price = price_container.select_one(".price-item--regular .money")
            if sale_price:
                price = sale_price.get_text(strip=True)
            elif regular_price:
                price = regular_price.get_text(strip=True)

        if image and image not in seen:
            labels = predict_labels(image)
            products.append({
                "title": title.strip(),
                "image": image.strip(),
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

    print(f"✅ Uploaded {len(products)} Outfitters products to Supabase: {BUCKET_FILE}")
    return products

if __name__ == "__main__":
    products = scrape_outfitters()
    print(f"📝 Total products scraped: {len(products)}")
