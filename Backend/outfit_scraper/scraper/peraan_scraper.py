import time
import requests
from io import BytesIO
from datetime import datetime, timedelta
from bs4 import BeautifulSoup
from supabase_helper import upload_scraped_data, download_json_from_bucket

import torch
import clip
from PIL import Image as PILImage
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.chrome.service import Service

# ===== SETTINGS =====
CLOTHING_ITEMS = [
    # --- Wedding / Formal Wear ---
     "lehenga choli", "anarkali dress", "floor length gown",
    "embroidered maxi", "handworked gown", "party wear dress", "embroidered frock",
    "formal frock", "embroidered dress", "wedding dress", "sharara suit", "gharara suit",
    "angrakha style dress", "embroidered shalwar kameez",
    "embroidered kurti", "embroidered suit", "maxi dress", "long kameez with lehenga",
    "embroidered long dress","shalwar kameez",

    # --- Light/Formal/Casual Wear ---
    "kurta", "shalwar kameez", "plain suit", "printed kurti", "2 piece dress", "3 piece dress",
    "ready to wear", "formal shirt", "casual top", "blouse", "jumpsuit", "romper",
    "western dress", "shirt dress", "summer dress",

    # --- Western Casuals (in case they appear) ---
    "t-shirt", "hoodie", "jacket", "coat", "blazer", "jeans", "pants", "trousers", "tops"
]

COLORS = [
    "red", "blue", "green", "black", "white", "yellow", "pink", "purple", "orange",
    "brown", "grey", "navy", "maroon", "beige", "teal", "gold", "silver", "peach",
    "mint", "ivory", "cream","mustard","lavender,"
]

PATTERNS = [
    "embroidered", "handworked", "embellished", "sequined", "beaded", "mirror work",
    "zari work", "gota work", "stone work", "thread work",
    "printed", "digital printed", "floral", "plain", "solid"
]

ALL_LABELS = CLOTHING_ITEMS + COLORS + PATTERNS

CACHE_FILE_NAME = "Peeran.json"
BUCKET_NAME = "scrape-data"
REFRESH_DAYS = 7

# ===== CLIP MODEL LOAD =====
device = "cuda" if torch.cuda.is_available() else "cpu"
clip_model, preprocess = clip.load("ViT-B/32", device=device)
text_tokens = clip.tokenize(ALL_LABELS).to(device)
with torch.no_grad():
    text_features = clip_model.encode_text(text_tokens)
    text_features /= text_features.norm(dim=-1, keepdim=True)


# ===== MULTI-LABEL PREDICTION =====
def predict_labels(image_url):
    try:
        r = requests.get(image_url, timeout=10)
        img = PILImage.open(BytesIO(r.content)).convert("RGB")
        img_input = preprocess(img).unsqueeze(0).to(device)

        with torch.no_grad():
            img_features = clip_model.encode_image(img_input)
            img_features /= img_features.norm(dim=-1, keepdim=True)
            similarity = (100.0 * img_features @ text_features.T).softmax(dim=-1)

        scores = similarity[0].cpu().numpy()
        ranked_labels = sorted(zip(ALL_LABELS, scores), key=lambda x: -x[1])

        # Initialize label lists
        clothing_found, colors_found, patterns_found = [], [], []

        for label, _ in ranked_labels:
            # Only 1 best clothing item
            if label in CLOTHING_ITEMS and len(clothing_found) < 1:
                clothing_found.append(label)
            # Up to 3 color hints
            elif label in COLORS and len(colors_found) < 3:
                colors_found.append(label)
            # 1 pattern or work style
            elif label in PATTERNS and len(patterns_found) < 1:
                patterns_found.append(label)

            if len(clothing_found) >= 1 and len(colors_found) >= 3 and len(patterns_found) >= 1:
                break

        return clothing_found + patterns_found + colors_found

    except Exception as e:
        print(f"⚠ Error predicting labels for {image_url}: {e}")
        return []


# ===== SCRAPER FUNCTION =====
def scrape_peeran_wedding_formals():
    service = Service(ChromeDriverManager().install())
    options = webdriver.ChromeOptions()
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_argument("--headless")

    driver = webdriver.Chrome(service=service, options=options)
    url = "https://peraan.com/collections/new-arrivals"
    print(f"📡 Opening: {url}")
    driver.get(url)
    time.sleep(5)

    # Scroll fully
    last_height = driver.execute_script("return document.body.scrollHeight")
    while True:
        driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
        time.sleep(2)
        new_height = driver.execute_script("return document.body.scrollHeight")
        if new_height == last_height:
            break
        last_height = new_height

    try:
        WebDriverWait(driver, 10).until(
            EC.presence_of_all_elements_located((By.CLASS_NAME, "bee-product-inner"))
        )
    except:
        print("⚠ Timeout waiting for products")

    soup = BeautifulSoup(driver.page_source, "html.parser")
    driver.quit()

    cards = soup.select("div.bee-product-inner")
    print(f"🔍 Found {len(cards)} product cards")

    products, seen_links = [], set()
    base_url = "https://peraan.com"

    for card in cards:
        title_tag = card.select_one("h3.bee-product-title a")
        title = title_tag.get_text(strip=True) if title_tag else "No title"

        link = base_url + title_tag.get("href") if title_tag else None
        if not link or link in seen_links:
            continue
        seen_links.add(link)

        # --- Extract price correctly ---
        price_tag = card.select_one("div.bee-product-price")
        price = "No price"

        if price_tag:
            ins = price_tag.select_one("ins")
            del_tag = price_tag.select_one("del")

            if ins:
                price = ins.get_text(strip=True)
            elif del_tag:
                price = del_tag.get_text(strip=True)
            else:
                # fallback
                price = price_tag.get_text(strip=True)

        # --- Image ---
        img_tag = card.select_one("img.bee-product-main-img")
        image = img_tag.get("src") if img_tag else None
        if not image or "data:image" in image:
            continue
        if image.startswith("//"):
            image = "https:" + image
        elif not image.startswith("http"):
            image = base_url + image

        # --- Predict labels using CLIP ---
        labels = predict_labels(image)

        products.append({
            "title": title,
            "price": price,
            "link": link,
            "image": image,
            "labels": labels
        })

    return products


# ===== SUPABASE CACHE WRAPPER =====
def get_peeran_wedding_formals():
    cached_data = download_json_from_bucket(BUCKET_NAME, CACHE_FILE_NAME)
    old_products = []
    if cached_data:
        last_scrape = datetime.fromisoformat(cached_data.get("last_scrape"))
        if datetime.now() - last_scrape < timedelta(days=REFRESH_DAYS):
            print("🗂 Using cached Peeran products (<7 days old)")
            return cached_data.get("products", [])
        old_products = cached_data.get("products", [])

    new_products = scrape_peeran_wedding_formals()

    # merge new + old (remove duplicates by link)
    existing_links = {p["link"] for p in old_products}
    merged_products = old_products[:]
    for prod in new_products:
        if prod["link"] not in existing_links:
            merged_products.append(prod)

    cache_json = {
        "last_scrape": datetime.now().isoformat(),
        "products": merged_products
    }
    upload_scraped_data(cache_json, BUCKET_NAME, CACHE_FILE_NAME)
    print(f"✅ Uploaded to Supabase: {CACHE_FILE_NAME}")
    return merged_products


if __name__ == "__main__":
    products = get_peeran_wedding_formals()
    print(f"📝 Total Peeran products returned: {len(products)}")
    for p in products[:5]:
        print(p)
