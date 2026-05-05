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
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager

# ===== SETTINGS =====
CLOTHING_ITEMS = [
    "top", "gown", "embroidered shalwar kameez", "printed kurti", "2 piece dress", "3 piece dress",
    "ready to wear", "party wear", "maxi dress", "dress", "embroidered kurta",
    "kurta", "shalwar kameez", "frock", "trouser", "shirt", "tunic", "blouse"
]

COLORS = [
    "red", "blue", "green", "black", "white", "yellow", "pink", "purple", "orange", "brown", "grey",
    "navy", "maroon", "beige", "teal", "gold", "silver"
]

PATTERNS = [
    "striped", "checked", "polka dot", "floral", "plain", "geometric", "animal print", "abstract", "solid",
    "embroidered", "printed", "digital printed", "floral print", "solid color", "tie-dye", "ombre", "lace", "sequined", "beaded"
]

ALL_LABELS = CLOTHING_ITEMS + COLORS + PATTERNS

CACHE_FILE_NAME = "Limelight Girls.json"
BUCKET_NAME = "scrape-data"
REFRESH_DAYS = 7

# ===== CLIP MODEL LOAD =====
device = "cuda" if torch.cuda.is_available() else "cpu"
clip_model, preprocess = clip.load("ViT-B/32", device=device)
text_tokens = clip.tokenize(ALL_LABELS).to(device)
with torch.no_grad():
    text_features = clip_model.encode_text(text_tokens)
    text_features /= text_features.norm(dim=-1, keepdim=True)


# ===== PREDICT LABELS FUNCTION (IMPROVED) =====
def predict_labels(image_url, title=""):
    try:
        # --- Load and preprocess image ---
        resp = requests.get(image_url, timeout=10)
        resp.raise_for_status()
        img = PILImage.open(BytesIO(resp.content)).convert("RGB")
        image_input = preprocess(img).unsqueeze(0).to(device)

        with torch.no_grad():
            img_features = clip_model.encode_image(image_input)
            img_features /= img_features.norm(dim=-1, keepdim=True)
            sims = (img_features @ text_features.T).squeeze(0)

            top_indices = sims.topk(20).indices.tolist()
            top_labels = [ALL_LABELS[i] for i in top_indices]

        # --- CLIP-based filtering ---
        clothing_clip = [l for l in top_labels if l in CLOTHING_ITEMS]
        colors_clip = [l for l in top_labels if l in COLORS]
        patterns_clip = [l for l in top_labels if l in PATTERNS]

        # --- Title-based filtering ---
        title_lower = title.lower()
        clothing_title = [item for item in CLOTHING_ITEMS if item in title_lower]
        colors_title = [c for c in COLORS if c in title_lower]
        patterns_title = [p for p in PATTERNS if p in title_lower]

        # --- Combine CLIP + title detections ---
        clothing = (clothing_title or clothing_clip[:1])[:1]  # exactly 1 clothing
        colors = (colors_title or colors_clip)[:2]  # up to 2 colors
        pattern = (patterns_title or patterns_clip[:1])[:1]  # exactly 1 pattern

        # --- Final merged list ---
        final_labels = []
        if clothing:
            final_labels.extend(clothing)
        if colors:
            final_labels.extend(colors)
        if pattern:
            final_labels.extend(pattern)

        # --- Remove duplicates while preserving order ---
        return list(dict.fromkeys(final_labels))

    except Exception as e:
        print(f"⚠ Error labeling image {image_url}: {e}")
        return []


# ===== SCRAPER FUNCTION =====
def scrape_limelight_girls():
    options = webdriver.ChromeOptions()
    options.add_argument("--headless=new")
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_argument("user-agent=Mozilla/5.0")

    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=options)

    url = "https://www.limelight.pk/collections/girls-wear"
    print("📡 Opening:", url)
    driver.get(url)
    time.sleep(5)

    # Auto-scroll
    last_height = driver.execute_script("return document.body.scrollHeight")
    while True:
        driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
        time.sleep(2)
        new_height = driver.execute_script("return document.body.scrollHeight")
        if new_height == last_height:
            break
        last_height = new_height

    try:
        WebDriverWait(driver, 15).until(
            EC.presence_of_all_elements_located((By.CSS_SELECTOR, "a.full-unstyled-link"))
        )
    except:
        print("⚠ Timeout waiting for product links")
        driver.quit()
        return []

    soup = BeautifulSoup(driver.page_source, "html.parser")
    driver.quit()

    link_tags = soup.select("a.full-unstyled-link")
    print(f"🧩 Found {len(link_tags)} product links")

    products = []
    seen_links = set()

    for link_tag in link_tags:
        title = link_tag.get_text(strip=True)
        href = link_tag.get("href", "")
        full_link = "https://www.limelight.pk" + href

        parent = link_tag.find_parent("div", class_="card-wrapper")
        price_tag = parent.select_one("span.money") if parent else None
        price = price_tag.get_text(strip=True) if price_tag else "N/A"

        img_tag = parent.find("img") if parent else None
        img_url = ""
        if img_tag:
            if img_tag.has_attr("srcset"):
                srcset_urls = img_tag["srcset"].split(",")
                if srcset_urls:
                    img_url = srcset_urls[-1].split()[0].strip()
            elif img_tag.has_attr("src"):
                img_url = img_tag["src"]
            if img_url.startswith("//"):
                img_url = "https:" + img_url

        if href in seen_links or not img_url:
            continue

        labels = predict_labels(img_url, title)

        products.append({
            "title": title,
            "price": price,
            "link": full_link,
            "image": img_url,
            "labels": labels
        })
        seen_links.add(href)

       

    return products


# ===== SUPABASE CACHE WRAPPER =====
def get_limelight_girls():
    cached_data = download_json_from_bucket(BUCKET_NAME, CACHE_FILE_NAME)
    if cached_data:
        last_scrape = datetime.fromisoformat(cached_data.get("last_scrape"))
        if datetime.now() - last_scrape < timedelta(days=REFRESH_DAYS):
            print("🗂 Using cached Limelight girls products (<7 days old)")
            return cached_data.get("products", [])

    products = scrape_limelight_girls()

    cache_json = {
        "last_scrape": datetime.now().isoformat(),
        "products": products
    }
    upload_scraped_data(cache_json, BUCKET_NAME, CACHE_FILE_NAME)
    print(f"✅ Uploaded to Supabase: {CACHE_FILE_NAME}")
    return products


# ===== RUN =====
if __name__ == "__main__":
    products = get_limelight_girls()
    print(f"📝 Total Limelight girls products returned: {len(products)}")

    
