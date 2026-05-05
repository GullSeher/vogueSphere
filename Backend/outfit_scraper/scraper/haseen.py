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
from PIL import Image
import requests

# --- Cache settings ---
CACHE_FILE_NAME = "Haseens.json"
BUCKET_NAME = "scrape-data"
REFRESH_DAYS = 7

# --- CLIP labels ---
CLOTHING_TYPES = ["maxi", "heavy maxi", "wedding maxi", "long maxifrock"]
COLORS = ["red", "blue", "green", "yellow", "black", "white", "pink", "purple",
          "orange", "brown", "beige", "gray"]
PATTERNS = ["plain", "printed", "embroidered", "striped", "checked", "polka dot", "floral"]
ALL_LABELS = CLOTHING_TYPES + COLORS + PATTERNS

# --- CLIP setup ---
device = "cuda" if torch.cuda.is_available() else "cpu"
clip_model, preprocess = clip.load("ViT-B/32", device=device)
text_tokens = clip.tokenize(ALL_LABELS).to(device)
with torch.no_grad():
    text_features = clip_model.encode_text(text_tokens)
    text_features /= text_features.norm(dim=-1, keepdim=True)

def label_image_multi(image_url):
    try:
        r = requests.get(image_url, timeout=10)
        img = Image.open(BytesIO(r.content)).convert("RGB")
        img_input = preprocess(img).unsqueeze(0).to(device)
        with torch.no_grad():
            img_features = clip_model.encode_image(img_input)
            img_features /= img_features.norm(dim=-1, keepdim=True)
            similarity = (100.0 * img_features @ text_features.T).softmax(dim=-1)[0]

        sorted_indices = similarity.argsort(descending=True).cpu().numpy()
        labels_sorted = [ALL_LABELS[i] for i in sorted_indices]

        clothing = [l for l in labels_sorted if l in CLOTHING_TYPES][:1]
        colors = [l for l in labels_sorted if l in COLORS][:2]
        pattern = [l for l in labels_sorted if l in PATTERNS][:1]

        return list(dict.fromkeys(clothing + colors + pattern))
    except Exception as e:
        print(f"⚠ Error labeling {image_url}: {e}")
        return ["unknown"]

def scrape_haseens_collection():
    service = Service(ChromeDriverManager().install())
    options = webdriver.ChromeOptions()
    options.add_argument("--headless")
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    driver = webdriver.Chrome(service=service, options=options)

    url = "https://haseensofficial.com/nodes/women-maxi-299"
    print(f"📡 Opening: {url}")
    driver.get(url)
    time.sleep(5)

    # Scroll to load all products
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

    items = soup.find_all("div", {"data-testid": "product-card"})
    print(f"🧩 Found {len(items)} products")

    products, seen = [], set()
    for item in items:
        # Get title
        img_tag = item.find("img", alt=True)
        title = img_tag["alt"].strip() if img_tag else "Unknown"

        # Get link — check for href or data-href
        link_tag = item.find("a", href=True)
        if link_tag:
            link = link_tag.get("href") or link_tag.get("data-href")
            if link and not link.startswith("http"):
                link = "https://haseensofficial.com" + link
        else:
            link = None

        # Get image
        image_tag = item.find("img", src=True)
        image_url = image_tag["src"] if image_tag else None

        # Get price
        price_tag = item.find("p", class_="display-price")
        price = price_tag.text.strip() if price_tag else "N/A"

        if title and image_url and link and image_url not in seen:
            labels = label_image_multi(image_url)
            products.append({
                "title": title,
                "link": link,
                "image": image_url,
                "price": price,
                "labels": labels
            })
            seen.add(image_url)

    print(f"🧩 Total products scraped: {len(products)}")
    return products

def get_haseens_products():
    cached_data = download_json_from_bucket(BUCKET_NAME, CACHE_FILE_NAME)
    if cached_data:
        last_scrape = datetime.fromisoformat(cached_data.get("last_scrape"))
        if datetime.now() - last_scrape < timedelta(days=REFRESH_DAYS):
            print("🗂 Using cached data (<7 days old)")
            return cached_data.get("products", [])

    products = scrape_haseens_collection()
    upload_scraped_data(
        {"last_scrape": datetime.now().isoformat(), "products": products},
        BUCKET_NAME,
        CACHE_FILE_NAME
    )
    print(f"✅ Uploaded to Supabase: {CACHE_FILE_NAME}")
    return products

# if __name__ == "__main__":
#     products = get_haseens_products()
#     print(json.dumps(products, indent=2))
# --------------------------
# Wrapper function for external import
# --------------------------
def get_haseen_products_wrapper():
    """Wrapper to match import style."""
    return get_haseens_products()


# Optional test
if __name__ == "__main__":
    products = get_haseen_products_wrapper()
    print(f"📝 Total Haseens products scraped: {len(products)}")
