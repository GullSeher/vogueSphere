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
from webdriver_manager.chrome import ChromeDriverManager
from supabase_helper import upload_scraped_data, download_json_from_bucket


# SETTINGS
URL = "https://engine.com.pk/collections/women-denims"
CACHE_FILE_NAME = "Engine.json"
BUCKET_NAME = "scrape-data"
BRAND_NAME = "engine"
REFRESH_DAYS = 7


# LABEL LIST
LABELS = [
    "jeans", "skinny jeans", "straight jeans", "wide leg jeans", "ripped jeans",
    "bootcut jeans", "high waisted jeans", "denims", "pants", "trousers",
    "black", "blue", "light blue", "dark blue", "navy", "grey", "white",
    "baggy", "mom fit", "slim fit", "flare pants", "cargo"
]


# Load CLIP
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"🔍 CLIP Device: {device}")

clip_model, preprocess = clip.load("ViT-B/32", device=device)

with torch.no_grad():
    text_tokens = clip.tokenize(LABELS).to(device)
    text_features = clip_model.encode_text(text_tokens)
    text_features /= text_features.norm(dim=-1, keepdim=True)



def clean_image_url(img_tag):
    """Fix lazy-load + get largest available resolution."""
    
    if not img_tag:
        return None

    # Priority list
    keys = ["data-srcset", "data-src", "srcset", "src"]

    for key in keys:
        if img_tag.get(key):
            url = img_tag.get(key)
            break
    else:
        return None

    # Select highest resolution if srcset
    if " " in url:  
        url = url.split(",")[-1].split(" ")[0]

    if url.startswith("//"):
        url = "https:" + url

    return url



def predict_label(image_url):
    """AI classification with CLIP"""
    
    try:
        img = PILImage.open(BytesIO(requests.get(image_url, timeout=10).content)).convert("RGB")
        img_input = preprocess(img).unsqueeze(0).to(device)

        with torch.no_grad():
            img_features = clip_model.encode_image(img_input)
            img_features /= img_features.norm(dim=-1, keepdim=True)

            sims = (img_features @ text_features.T).cpu().numpy()[0]
            return LABELS[sims.argmax()]  # Best match only

    except Exception as e:
        print(f"⚠️ Label Error: {e}")
        return "unknown"



def scrape_engine_products():
    """Main scraper"""

    # Cache handling
    cache = download_json_from_bucket(BUCKET_NAME, CACHE_FILE_NAME)
    if cache:
        try:
            last_date = datetime.fromisoformat(cache["last_scrape"])
            if datetime.now() - last_date < timedelta(days=REFRESH_DAYS):
                print("📦 Using Cached Data")
                return cache["products"]
        except:
            pass

    print("🌍 SCRAPING ENGINE WEBSITE...")

    # Selenium Setup
    options = webdriver.ChromeOptions()
    options.add_argument("--headless=new")
    options.page_load_strategy = "eager"
    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)

    driver.get(URL)
    time.sleep(5)

    # Scroll
    for _ in range(10):
        driver.execute_script("window.scrollBy(0, document.body.scrollHeight)")
        time.sleep(2)

    soup = BeautifulSoup(driver.page_source, "html.parser")
    driver.quit()

    product_tags = soup.select("a.o-product-thumbnail")
    print(f"🧩 Products Found: {len(product_tags)}")

    products = []

    for item in product_tags:
        title = (item.select_one("p.o-product-thumbnail__title") or "").get_text(strip=True)
        price = (item.select_one(".o-pricing__money") or "").get_text(strip=True)
        link = "https://engine.com.pk" + item.get("href", "")
        
        # Fix image
        img_tag = item.find("img")
        img_url = clean_image_url(img_tag)

        label = predict_label(img_url) if img_url else "unknown"

        products.append({
            "title": title,
            "price": price,
            "image": img_url,
            "link": link,
            "ai_label": label,
            "brand": BRAND_NAME
        })

    # Upload to Supabase
    data = {"last_scrape": datetime.now().isoformat(), "products": products}
    upload_scraped_data(BUCKET_NAME, CACHE_FILE_NAME, data)

    print("✅ DONE — Uploaded to Supabase")

    return products



if __name__ == "__main__":
    scrape_engine_products()
