import time
import json
from datetime import datetime, timedelta
from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from supabase_helper import upload_scraped_data, download_json_from_bucket
from io import BytesIO
import torch
import clip
from PIL import Image as PILImage
import requests

# --- Cache settings ---
CACHE_FILE_NAME = "Thestylefits.json"
BUCKET_NAME = "scrape-data"
REFRESH_DAYS = 7

# --- Clothing type reference ---
CLOTHING_ITEMS = ["long frock", "long a-line dress", "maxi dress", "long dress"]
COLORS = ["red", "blue", "green", "black", "white", "yellow", "pink", "purple",
          "orange", "brown", "grey", "navy", "maroon", "beige", "teal", "gold",
          "silver", "light blue", "dark blue", "sky blue", "indigo", "denim blue",
          "olive", "khaki", "mustard", "cream", "off white", "rust",
          "charcoal", "mint", "peach", "lavender"]
PATTERNS = ["striped", "checked", "polka dot", "floral", "plain", "geometric",
            "animal print", "abstract", "solid", "embroidered", "printed",
            "digital printed", "floral print", "tie-dye", "ombre"]

ALL_LABELS = CLOTHING_ITEMS + COLORS + PATTERNS

# --- CLIP setup ---
device = "cuda" if torch.cuda.is_available() else "cpu"
clip_model, preprocess = clip.load("ViT-B/32", device=device)
text_tokens = clip.tokenize(ALL_LABELS).to(device)
with torch.no_grad():
    text_features = clip_model.encode_text(text_tokens)
    text_features /= text_features.norm(dim=-1, keepdim=True)

def label_image_multi(image_url):
    """Label image using CLIP"""
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

def extract_image_url(item):
    """Extract first image URL from data-bgset or style"""
    img_div = item.find("div", class_=lambda x: x and "main-img" in x)
    if not img_div:
        return None

    # 1️⃣ Try data-bgset
    bgset = img_div.get("data-bgset")
    if bgset:
        urls = [u.split()[0] for u in bgset.split(",") if u.endswith((".jpg", ".jpeg", ".png", ".webp"))]
        if urls:
            url = urls[0].strip()
            if url.startswith("//"):
                url = "https:" + url
            return url

    # 2️⃣ Try style attribute
    style = img_div.get("style", "")
    if "background-image" in style:
        start = style.find("url(")
        end = style.find(")", start)
        if start != -1 and end != -1:
            url = style[start+4:end].strip('\"\'')
            if url.startswith("//"):
                url = "https:" + url
            return url

    return None

def scrape_thestylefits():
    service = Service(ChromeDriverManager().install())
    options = webdriver.ChromeOptions()
    options.add_argument("--headless")
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    driver = webdriver.Chrome(service=service, options=options)

    url = "https://thestylefits.com/collections/long-dresses-1"
    print(f"📡 Opening: {url}")
    driver.get(url)
    time.sleep(3)

    # Scroll slowly to load all lazy products
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

    items = soup.find_all("div", class_=lambda x: x and "product-inner" in x)
    print(f"🧩 Found {len(items)} products in DOM")

    products, seen = [], set()
    base_url = "https://thestylefits.com"

    for item in items:
        # --- Title ---
        title_tag = item.find("h3", class_=lambda x: x and "product-title" in x)
        title = title_tag.get_text(strip=True) if title_tag else "Unknown"

        # --- Link ---
        link = None
        if title_tag:
            a_tag = title_tag.find("a")
            if a_tag and a_tag.get("href"):
                link = base_url + a_tag.get("href")

        # --- Image ---
        image_url = extract_image_url(item)
        if not image_url:
            continue

        # --- Price ---
        price_tag = item.find("span", class_=lambda x: x and "price" in x)
        if price_tag and price_tag.find("ins"):
            price = price_tag.find("ins").get_text(strip=True)
        elif price_tag:
            price = price_tag.get_text(strip=True)
        else:
            price = "N/A"

        if title and link and image_url not in seen:
            labels = label_image_multi(image_url)
            products.append({
                "title": title,
                "link": link,
                "image": image_url,
                "price": price,
                "labels": labels
            })
            seen.add(image_url)

    return products

def get_thestylefits_products():
    try:
        cached_data = download_json_from_bucket(BUCKET_NAME, CACHE_FILE_NAME)
    except Exception:
        cached_data = None
        print("⚠️ No cache found, scraping fresh data")

    if cached_data:
        last_scrape = datetime.fromisoformat(cached_data.get("last_scrape"))
        if datetime.now() - last_scrape < timedelta(days=REFRESH_DAYS):
            print("🗂 Using cached data (<7 days old)")
            return cached_data.get("products", [])

    products = scrape_thestylefits()
    upload_scraped_data(
        {"last_scrape": datetime.now().isoformat(), "products": products},
        BUCKET_NAME,
        CACHE_FILE_NAME
    )
    print(f"✅ Uploaded to Supabase: {CACHE_FILE_NAME}")
    return products

if __name__ == "__main__":
    products = get_thestylefits_products()
    print(f"📝 Total products scraped: {len(products)}")
    print(json.dumps(products, indent=2))
