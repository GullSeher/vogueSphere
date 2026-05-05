import time
import requests
from io import BytesIO
from datetime import datetime, timedelta
from bs4 import BeautifulSoup
from PIL import Image as PILImage, UnidentifiedImageError

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
BUCKET_FILE = "Sitara Sarees.json"
BUCKET_NAME = "scrape-data"
REFRESH_DAYS = 7

CLOTHING_ITEMS = ["saree"]  # fixed — this page only has sarees

COLORS = [
    "red", "blue", "green", "black", "white", "yellow", "pink", "purple",
    "orange", "brown", "grey", "navy", "maroon", "beige", "teal", "gold", "silver"
]

PATTERNS = [
    "striped", "checked", "polka dot", "floral", "plain", "geometric", "animal print",
    "abstract", "solid", "embroidered", "printed", "digital printed", "floral print",
    "tie-dye", "ombre", "lace", "sequined", "beaded"
]

ALL_LABELS = CLOTHING_ITEMS + COLORS + PATTERNS

# ===== CLIP model load =====
device = "cuda" if torch.cuda.is_available() else "cpu"
clip_model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32").to(device)
processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")

# warm up
with torch.no_grad():
    _ = processor(
        text=ALL_LABELS,
        images=[PILImage.new("RGB", (224, 224))],
        return_tensors="pt",
        padding=True
    ).to(device)


def predict_labels(image_url, title_text=""):
    """Predict labels using CLIP + title filtering (always 'saree')."""
    try:
        response = requests.get(image_url, timeout=15)
        response.raise_for_status()
        image = PILImage.open(BytesIO(response.content)).convert("RGB")

        final_labels = ["saree"]  # fixed item

        # ----- Text-based pre-filter -----
        title_lower = title_text.lower()

        detected_colors = [c for c in COLORS if c in title_lower]
        detected_patterns = [p for p in PATTERNS if p in title_lower]

        # CLIP fallback if not found in title
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

        # ---- Colors ----
        if detected_colors:
            final_labels.extend(detected_colors[:2])
        else:
            final_labels.extend(get_top_matches(COLORS, topn=2))

        # ---- Patterns ----
        if detected_patterns:
            final_labels.extend(detected_patterns[:1])
        else:
            final_labels.extend(get_top_matches(PATTERNS, topn=1))

        return list(dict.fromkeys(final_labels))  # remove duplicates

    except (UnidentifiedImageError, Exception) as e:
        print(f"⚠️ Skipping invalid image {image_url}: {e}")
        return ["saree"]


def scrape_sitara():
    """Scrape Sitara Sarees with CLIP + text-filter labels and caching."""
    cached_data = download_json_from_bucket(BUCKET_NAME, BUCKET_FILE)
    if cached_data:
        cache_time = datetime.fromisoformat(cached_data.get("_cached_at"))
        if datetime.utcnow() - cache_time < timedelta(days=REFRESH_DAYS):
            print(f"📂 Using cached Sitara Sarees data ({BUCKET_FILE})")
            return cached_data["products"]

    # --- Chrome setup ---
    service = Service(ChromeDriverManager().install())
    options = webdriver.ChromeOptions()
    options.add_argument("--headless=new")
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_argument("--window-size=1920,1080")
    options.add_argument(
        "user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36"
    )

    driver = webdriver.Chrome(service=service, options=options)
    driver.set_page_load_timeout(60)

    url = "https://sitarasarees.com/product-category/sequins-saree/"
    print(f"📡 Opening: {url}")

    try:
        driver.get(url)
    except Exception as e:
        print(f"⚠️ Page load failed: {e}")
        driver.quit()
        return []

    try:
        WebDriverWait(driver, 20).until(
            EC.presence_of_all_elements_located((By.CSS_SELECTOR, "li.product"))
        )
    except:
        print("⚠️ Products did not load in time.")
        driver.quit()
        return []

    # Scroll to load all
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

    items = soup.select("li.product")
    print(f"🧩 Sitara Sarees product cards found: {len(items)}")

    products = []
    seen_images = set()

    for item in items:
        # Correct title & link selector
        title_tag = item.select_one("h3 a")
        title = title_tag.get_text(strip=True) if title_tag else "Untitled"
        link = title_tag.get("href") if title_tag else None

        img_tag = item.select_one("img")
        image = (
            img_tag.get("data-src") or img_tag.get("src") if img_tag else None
        )
        if image and image.startswith("//"):
            image = "https:" + image

        price_tag = item.select_one("span.woocommerce-Price-amount")
        price = price_tag.get_text(strip=True) if price_tag else "Price not found"

        if image and image not in seen_images:
            labels = predict_labels(image, title)
            products.append({
                "title": title.strip(),
                "image": image.strip(),
                "link": link.strip() if link else None,
                "price": price,
                "labels": labels
            })
            seen_images.add(image)

    payload = {"_cached_at": datetime.utcnow().isoformat(), "products": products}
    upload_scraped_data(payload, BUCKET_NAME, BUCKET_FILE)
    print(f"✅ Uploaded {len(products)} Sitara Sarees products to Supabase: {BUCKET_FILE}")

    return products


if __name__ == "__main__":
    products = scrape_sitara()
    print(f"📝 Total products scraped: {len(products)}")
    for p in products[:5]:
        print(p)
