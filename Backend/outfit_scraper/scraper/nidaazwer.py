import time
import json
from datetime import datetime, timedelta
from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from supabase_helper import upload_scraped_data, download_json_from_bucket
import ast  

# --- Cache settings ---
CACHE_FILE_NAME = "Nidaazwer Bridal Lehenga.json"
BUCKET_NAME = "scrape-data"
REFRESH_DAYS = 7

# --- Fixed Category ---
CLOTHING_TYPE = "lehenga"

# --- Colors & Patterns reference ---
COLORS = [
    "red", "blue", "green", "black", "white", "yellow", "pink", "purple", "orange", "brown", "grey",
    "navy", "maroon", "beige", "teal", "gold", "silver",
    "light blue", "dark blue", "sky blue", "indigo", "denim blue",
    "olive", "khaki", "mustard", "cream", "off white", "rust",
    "charcoal", "mint", "peach", "lavender"
]

PATTERNS = [
    "striped", "checked", "polka dot", "floral", "plain", "geometric",
    "animal print", "abstract", "solid", "embroidered", "printed",
    "digital printed", "floral print", "tie-dye", "ombre"
]

def normalize_text(text):
    """Clean & normalize raw tags."""
    text = text.lower().strip()
    if "embroider" in text:
        return "embroidered"
    if "print" in text and text != "printed":
        return "floral print"
    if text == "solid":
        return "plain"
    return text

def format_labels(colors, patterns):
    """Create flat labels array: 1 clothing type + colors + patterns"""
    labels = [CLOTHING_TYPE] + colors + patterns
    return list(dict.fromkeys(labels))  # remove duplicates

def scrape_nidaazwer():
    service = Service(ChromeDriverManager().install())
    options = webdriver.ChromeOptions()
    options.add_argument("--disable-gpu")
    options.add_argument("--headless")

    driver = webdriver.Chrome(service=service, options=options)
    url = "https://pk.nidaazwer.com/collections/bridal-lehnga"
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

    items = soup.find_all("div", class_="t4s-product")
    print(f"🧩 Found {len(items)} products")

    products, seen = [], set()
    base_url = "https://pk.nidaazwer.com"

    for item in items:
        title_tag = item.find("h3", class_="t4s-product-title")
        title = title_tag.text.strip() if title_tag else "Unknown"

        img_tag = item.find("img", class_="t4s-product-main-img")
        image = img_tag.get("src") if img_tag else None
        if image and image.startswith("//"):
            image = "https:" + image

        # --- Skip invalid placeholder images ---
        if not image or image.startswith("data:image/gif;base64"):
            print(f"⚠️ Skipping product '{title}' due to invalid image")
            continue

        link_tag = item.find("a", class_="t4s-full-width-link")
        link = base_url + link_tag["href"] if link_tag else None

        vendor_tag = item.find("div", class_="t4s-product-vendor")
        vendor = vendor_tag.text.strip() if vendor_tag else ""

        price_tag = item.find("div", class_="t4s-product-price")
        price = "WhatsApp Inquiry"
        whatsapp_link = None
        if price_tag:
            price_value = price_tag.get_text(strip=True)
            if any(char.isdigit() for char in price_value):
                price = price_value
            link_inside = price_tag.find("a")
            if link_inside:
                whatsapp_link = link_inside.get("href")

        # --- RAW TAGS ---
        data_msttags = item.get("data-msttags", "[]")
        try:
            tags_list = ast.literal_eval(data_msttags.replace("&quot;", '"'))
        except:
            tags_list = []

        normalized = [normalize_text(t) for t in tags_list]
        found_colors = [t for t in normalized if t in COLORS]
        found_patterns = [t for t in normalized if t in PATTERNS]

        labels = format_labels(found_colors, found_patterns)

        if title and link and image not in seen:
            products.append({
                "title": title,
                "vendor": vendor,
                "image": image,
                "link": link,
                "price": price,
                "whatsapp_inquiry": whatsapp_link if price == "WhatsApp Inquiry" else None,
                "labels": labels
            })
            seen.add(image)

    return products

def get_nidaazwer_products():
    cached_data = download_json_from_bucket(BUCKET_NAME, CACHE_FILE_NAME)
    if cached_data:
        last_scrape = datetime.fromisoformat(cached_data.get("last_scrape"))
        if datetime.now() - last_scrape < timedelta(days=REFRESH_DAYS):
            print("🗂 Using cached data (<7 days old)")
            return cached_data.get("products", [])

    products = scrape_nidaazwer()
    upload_scraped_data(
        {"last_scrape": datetime.now().isoformat(), "products": products},
        BUCKET_NAME,
        CACHE_FILE_NAME
    )
    print(f"✅ Uploaded to Supabase: {CACHE_FILE_NAME}")
    return products

# --------------------------
# Wrapper for external import
# --------------------------
def get_nidaazwer_products_wrapper():
    """Wrapper to use with uniform import style."""
    return get_nidaazwer_products()


# Optional test
if __name__ == "__main__":
    products = get_nidaazwer_products_wrapper()
    print(f"📝 Total Nidaazwer products scraped: {len(products)}")
