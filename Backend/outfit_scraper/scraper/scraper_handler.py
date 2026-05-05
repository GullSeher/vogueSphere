from akgalleria import get_akgalleria_products as akgalleria_scrape
from aquilaJeans_scraper import get_aquila_jeans as aquila_scrape
from batik import get_batik_products as batik_scrape
from breakout_scraper import get_products_with_supabase_cache as breakout_scrape
from engine_scraper import scrape_engine_products as engine_scrape
from eveen import get_eveen_products as eveen_scrape
from generation_anarkali import get_generation_anarkali_products as generation_anarkali_scrape
from generation_scraper import get_generation_products as generation_scrape
from haseen import get_haseen_products_wrapper as haseen_scrape
from khaadi_scraper import get_khaadi_products as khaadi_scrape
from lulusar import get_lulusar_products as lulusar_scrape
from nidaazwer import get_nidaazwer_products as nidaazwer_scrape
from nishat_scraper import get_nishat_pants as nishat_scrape
from peraan_scraper import get_peeran_wedding_formals as peraan_scrape
from scrape_limelight import get_limelight_girls as limelight_scrape
from scraper_outfitters import scrape_outfitters as outfitters_scrape
from sitara_scraper import scrape_sitara as sitara_scrape
from thesaarigirl import scrape_thesaarigirl as thesaarigirl_scrape
from thestylefits import get_thestylefits_products as thestylefits_scrape

import time

def run_all_scrapers_sequential():
    all_products = {}
    print("\n🚀 Starting all scrapers sequentially...\n")

    scrapers_order = [
        "akgalleria", "aquilaJeans", "batik", "breakout", "engine", "eveen",
        "generation_anarkali", "generation", "haseen", "khaadi", "lulusar",
        "nidaazwer", "peraan", "limelight", "outfitters", "sitara",
        "thesaarigirl", "thestylefits", "nishat"
    ]

    scrapers = {
        "akgalleria": akgalleria_scrape,
        "aquilaJeans": aquila_scrape,
        "batik": batik_scrape,
        "breakout": breakout_scrape,
        "engine": engine_scrape,
        "eveen": eveen_scrape,
        "generation_anarkali": generation_anarkali_scrape,
        "generation": generation_scrape,
        "haseen": haseen_scrape,
        "khaadi": khaadi_scrape,
        "lulusar": lulusar_scrape,
        "nidaazwer": nidaazwer_scrape,
        "nishat": nishat_scrape, 
        "peraan": peraan_scrape,
        "outfitters": outfitters_scrape,
        "limelight": limelight_scrape,
        "sitara": sitara_scrape,
        "thesaarigirl": thesaarigirl_scrape,
        "thestylefits": thestylefits_scrape,
    }

    for brand in scrapers_order:
        try:
            print(f"📌 Running {brand} scraper...")
            result = scrapers[brand]()
            all_products[brand] = result
            print(f"✅ {brand} completed ({len(result)} products)\n")
            time.sleep(2)  # safe delay between scrapers
        except Exception as e:
            print(f"❌ {brand} scraper failed: {e}")
            all_products[brand] = []

    # Summary
    print("\n📦 SCRAPING SUMMARY:\n")
    total = sum(len(v) for v in all_products.values())
    for brand, items in all_products.items():
        print(f"  • {brand}: {len(items)} items")
    # print(f"\n🎉 TOTAL PRODUCTS SCRAPED: {total}\n")
    print("🚀 Scraping completed!")

    return all_products


if __name__ == "__main__":
    run_all_scrapers_sequential()
