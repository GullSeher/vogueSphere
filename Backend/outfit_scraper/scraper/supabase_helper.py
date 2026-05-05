# from supabase import create_client
# from datetime import datetime
# import json

# # Ye tumhare project ka URL & Key (ye tum JS wale backend ke supabaseClient.js se copy kar sakti ho)
# SUPABASE_URL = "https://apuzxvwyfdjzmzxveaib.supabase.co"
# SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwdXp4dnd5ZmRqem16eHZlYWliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUxNDMwNzgsImV4cCI6MjA2MDcxOTA3OH0.eGJjsanuHEqaG4F3IhI8g2vSEwN-29aVGsRy5paxg7o"  # Service role use karo for storage upload


# supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# # List of all brands
# BRANDS = [
#     "breakout",
#     "outfitters",
#     "engine",
#     "generation",
#     "peeran",
#     "the_sari_girl",
#     "khaadi",
#     "pret",
#     "nishat",
#     "limelight"
# ]

# def upload_scraped_data(data, bucket_name, file_name=None):
#     """
#     Upload JSON data to Supabase storage bucket
#     data: dict/list
#     bucket_name: name of Supabase bucket (e.g., "scraped_data")
#     file_name: optional filename, if None it generates with timestamp
#     """
#     if not file_name:
#         file_name = f"scraped_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"

#     try:
#         json_bytes = json.dumps(data, ensure_ascii=False, indent=4).encode("utf-8")
#         supabase.storage.from_(bucket_name).upload(
#             file_name, json_bytes, {"content-type": "application/json"}
#         )
#         print(f"✅ Uploaded to Supabase: {file_name}")
#     except Exception as e:
#         print(f"❌ Error uploading data: {e}")


# def download_json_from_bucket(bucket_name, file_name):
#     """
#     Download JSON file from Supabase storage bucket
#     Returns dict/list or None if not found
#     """
#     try:
#         res = supabase.storage.from_(bucket_name).download(file_name)
#         if res:
#             data = json.loads(res.read().decode("utf-8"))
#             return data
#         return None
#     except Exception as e:
#         print(f"⚠️ Error downloading {file_name} from {bucket_name}: {e}")
#         return None


# from supabase import create_client
# from datetime import datetime
# import json

# SUPABASE_URL = "https://apuzxvwyfdjzmzxveaib.supabase.co"
# SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwdXp4dnd5ZmRqem16eHZlYWliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUxNDMwNzgsImV4cCI6MjA2MDcxOTA3OH0.eGJjsanuHEqaG4F3IhI8g2vSEwN-29aVGsRy5paxg7o"

# supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# BRANDS = [
#     "breakout",
#     "outfitters",
#     "engine",
#     "generation",
#     "peeran",
#     "the_sari_girl",
#     "khaadi",
#     "pret",
#     "nishat",
#     "limelight"
# ]

# def upload_scraped_data(data, bucket_name, file_name=None):
#     if not file_name:
#         file_name = f"scraped_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"

#     try:
#         json_bytes = json.dumps(data, ensure_ascii=False, indent=4).encode("utf-8")
#         supabase.storage.from_(bucket_name).upload(
#             file_name, json_bytes, {"content-type": "application/json"}
#         )
#         print(f"✅ Uploaded to Supabase: {file_name}")
#     except Exception as e:
#         print(f"❌ Error uploading data: {e}")

# # --- NEW FUNCTION: replace the old download_json_from_bucket ---
# def download_json_from_bucket(bucket_name, file_name):
#     try:
#         response = supabase.storage.from_(bucket_name).download(file_name)
#         if response is None:
#             return None
#         data_bytes = response  # this is bytes
#         data_str = data_bytes.decode("utf-8")  # convert bytes to string
#         return json.loads(data_str)  # convert string to dict/list
#     except Exception as e:
#         print(f"⚠️ Error downloading {file_name} from {bucket_name}: {e}")
#         return None









from supabase import create_client
from datetime import datetime
import json

# --- Supabase credentials (replace with env vars for security in production) ---
SUPABASE_URL = "https://apuzxvwyfdjzmzxveaib.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwdXp4dnd5ZmRqem16eHZlYWliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUxNDMwNzgsImV4cCI6MjA2MDcxOTA3OH0.eGJjsanuHEqaG4F3IhI8g2vSEwN-29aVGsRy5paxg7o"

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# --- Brand names list (optional, use in scrapers) ---
BRANDS = [
    "breakout",
    "outfitters",
    "engine",
    "generation",
    "peeran",
    "the_sari_girl",
    "khaadi",
    "pret",
    "nishat",
    "limelight"
    "Aquila",
    "The Enclothe",
    "sitara"

]


# --- Upload JSON to Supabase bucket ---
def upload_scraped_data(data, bucket_name, file_name=None):
    if not file_name:
        file_name = f"scraped_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"

    try:
        json_bytes = json.dumps(data, ensure_ascii=False, indent=4).encode("utf-8")
        res = supabase.storage.from_(bucket_name).upload(
            path=file_name,
            file=json_bytes,
            file_options={"content-type": "application/json", "upsert": "true"}  # ✅ FIX
        )
        print(f"✅ Uploaded to Supabase: {file_name}")
        return res
    except Exception as e:
        print(f"❌ Error uploading {file_name}: {e}")
        return None


# --- Download JSON from Supabase bucket ---
def download_json_from_bucket(bucket_name, file_name):
    try:
        res = supabase.storage.from_(bucket_name).download(file_name)
        if not res:
            print(f"⚠️ No file found: {file_name}")
            return None

        data_str = res.decode("utf-8")  # bytes → str
        return json.loads(data_str)     # str → dict
    except Exception as e:
        print(f"⚠️ Error downloading {file_name} from {bucket_name}: {e}")
        return None