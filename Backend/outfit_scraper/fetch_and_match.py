from flask import Flask, request, jsonify
import torch
from PIL import Image
from transformers import CLIPProcessor, CLIPModel
from ultralytics import YOLO
from scraper.supabase_helper import download_json_from_bucket, supabase
from flask_cors import CORS
from io import BytesIO
import traceback
import json
from thefuzz import fuzz
import uuid

# =========================
# Flask Setup
# =========================
app = Flask(__name__)
CORS(app)

# =========================
# Device
# =========================
device = "cuda" if torch.cuda.is_available() else "cpu"

# =========================
# YOLOv8 Model
# =========================
yolo_model = YOLO("yolov8n.pt")

# Allowed / Rejected classes
ALLOWED_CLASSES = ["person", "hanger"]  # person or hanging clothes
REJECT_CLASSES = [
    "dog", "cat", "horse", "sheep", "cow", "elephant", "bear", "zebra", "giraffe", "bird"
]

# =========================
# CLIP Model
# =========================
clip_model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32").to(device)
clip_processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")

# =========================
# ==== Labels ====
CLOTHING_ITEMS = [
#     JEANS
"skinny jeans", "straight jeans", "wide leg jeans", "bootcut jeans", "high waisted jeans",
"ripped jeans", "cropped jeans", "jeans", "denims",
# // PANTS / TROUSERS
"trousers", "pants", "shorts", "leggings",

#  JACKETS & OUTERWEAR
"denim jacket", "jacket", "coat", "blazer", "cardigan", "sweater", "hoodie",
# // SHIRTS
"t-shirt", "casual shirt", "formal shirt", "collar shirt",
"half sleeves shirt", "full sleeves shirt",
# // TOPS
"tank top", "tops", "casual top", "blouse",
# // WESTERN DRESSES
"maxi dress", "dress", "western dress", "bodycon dress",
"shirt dress", "summer dress", "party wear dress",
"formal frock", "frock", "romper", "jumpsuit",

# // EASTERN WEAR
"embroidered shalwar kameez", "printed kurti", "plain suit",
"2 piece dress", "3 piece dress", "ready to wear", "party wear",
"kurta", "shalwar kameez",
# // BRIDAL & FORMAL
"wedding dress", "lehenga", "lehenga choli", "bridal lehenga",
"anarkali", "floor length gown", "sharara suit",
 "long kameez with lehenga",
"embroidered wedding dress", "designer wedding gown",
# // SAREE
"saree", "silk saree", "cotton saree", "chiffon saree", "georgette saree",
"banarasi saree", "kanjivaram saree", "linen saree", "net saree", "organza saree",
"printed saree", "embroidered saree", "party wear saree", "wedding saree",
"handloom saree", "tissue saree", "crepe saree", "velvet saree", "satin saree",
# // SKIRT & CO-ORD SETS
"skirt", "two piece skirt set", "co-ord set", "top and skirt"



]

PATTERNS = [
    "striped", "checked", "polka dot", "floral", "plain", "geometric", "animal print",
    "abstract", "solid", "embroidered", "printed", "digital printed", "floral print",
    "solid color", "tie-dye", "ombre", "lace", "sequined", "beaded"
]

ALL_LABELS = CLOTHING_ITEMS + PATTERNS

# =========================
# Label → JSON Mapping
# =========================
LABEL_TO_FILES = {
    # ===== Jumpsuits / Playsuits =====
    "jumpsuit": ["Akgalleria Jumpsuits.json"],
    "romper": ["Akgalleria Jumpsuits.json"],
    "playsuit": ["Akgalleria Jumpsuits.json"],

    # ===== Jeans / Pants / Trousers =====
    "skinny jeans": ["Breakout.json", "Aquila.json", "Engine.json", "Nishat Pants.json", "outfitters.json"],
    "straight jeans": ["Breakout.json", "Aquila.json", "Engine.json", "Nishat Pants.json", "outfitters.json"],
    "wide leg jeans": ["Breakout.json", "Aquila.json", "Engine.json", "Nishat Pants.json", "outfitters.json"],
    "bootcut jeans": ["Breakout.json", "Aquila.json", "Engine.json", "Nishat Pants.json", "outfitters.json"],
    "high waisted jeans": ["Breakout.json", "Aquila.json", "Engine.json", "Nishat Pants.json", "outfitters.json"],
    "ripped jeans": ["Breakout.json", "Aquila.json", "Engine.json", "Nishat Pants.json", "outfitters.json"],
    "cropped jeans": ["Breakout.json", "Aquila.json", "Engine.json", "Nishat Pants.json", "outfitters.json"],
    "jeans": ["Breakout.json", "Aquila.json", "Engine.json", "Nishat Pants.json", "outfitters.json"],
    "denims": ["Breakout.json", "Aquila.json", "Engine.json", "Nishat Pants.json", "outfitters.json"],
    "trousers": ["Breakout.json", "Aquila.json", "Engine.json", "Nishat Pants.json", "outfitters.json"],
    "pants": ["Breakout.json", "Aquila.json", "Engine.json", "Nishat Pants.json", "outfitters.json"],

    # ===== Tops / Shirts =====
    "t-shirt": ["Breakout.json", "outfitters.json"],
    "casual shirt": ["Breakout.json", "outfitters.json"],
    "formal shirt": ["Breakout.json", "Eveen Hoodie.json", "outfitters.json"],
    "collar shirt": ["Breakout.json", "outfitters.json"],
    "half sleeves shirt": ["Breakout.json", "outfitters.json","Generation.json"],
    "full sleeves shirt": ["Breakout.json", "outfitters.json"],
    "tank top": ["Breakout.json","outfitters.json","Generation.json"],
    "tops": ["Breakout.json", "outfitters.json","Generation.json"],
    "casual top": ["Breakout.json","Generation.json"],
    "blouse": ["Breakout.json", "Generation.json","outfitters.json"],

    # ===== Outerwear =====
    "hoodie": ["Eveen Hoodie.json"],
    "sweater": ["Breakout.json", "Eveen Hoodie.json"],
    "cardigan": ["Breakout.json", "Eveen Hoodie.json"],
    "blazer": ["Breakout.json", "Eveen Hoodie.json"],
    "jacket": ["Breakout.json", "Eveen Hoodie.json"],
    "coat": ["Breakout.json", "Eveen Hoodie.json"],
    "denim jacket": ["Breakout.json", "Eveen Hoodie.json"],

    # ===== Dresses / Women Wear =====
    "dress": ["Breakout.json", "Generation Anarkali.json", "Generation.json"],
    "maxi dress": ["Breakout.json", "Generation Anarkali.json", "Generation.json","Thestylefits.json"],
    "bodycon dress": ["Breakout.json"],
    "shirt dress": ["Breakout.json","Generation.json","outfitters.json"],
    # "summer dress": ["Breakout.json"],
    "skirt": ["Lulusar Skirts.json", "Breakout.json","Thestylefits.json"],
    "two piece skirt set": ["Lulusar Skirts.json","Thestylefits.json"],
    "co-ord set": ["Lulusar Skirts.json"],
    "top and skirt": ["Lulusar Skirts.json","Thestylefits.json"],
    "formal frock": ["Generation Anarkali.json","Thestylefits.json"],
    "frock": ["Generation Anarkali.json","Thestyelefits.json"],
    "anarkali": ["Generation Anarkali.json"],
    "long dress": ["Generation Anarkali.json","Thestyelefits.json"],
    "western dress": ["Breakout.json","outfitters.json","Thestylefits.json","lulusar skirts.json","generation.json","Eveen Hoodie.json"],

    # ===== Shalwar Kameez =====
    "embroidered shalwar kameez": ["Batik.json","khaadi.json","limelight"],
    "embroidered shalwar kameez with dupatta": ["Batik.json"],
    "printed kurti": ["Batik.json","khaadi.json","limelight girls.json"],
    "shalwar kameez": ["Batik.json","khaadi.json","limelight Girls.json"],

    # ===== Lehengas / Bridal =====
    "lehenga": ["Nidaazwer Bridal Lehenga.json", "Peeran.json","Haseens.json"],
    "lehenga choli": ["Nidaazwer Bridal Lehenga.json", "Peeran.json","Haseens.json"],
    "bridal lehenga": ["Nidaazwer Bridal Lehenga.json", "Peeran.json","Haseens.json"],

    # ===== Sarees =====
    "saree": ["Sitara Sarees.json", "The Saari Girl.json"],
    "silk saree": ["Sitara Sarees.json", "The Saari Girl.json"],
    "cotton saree": ["Sitara Sarees.json", "The Saari Girl.json"],
    "chiffon saree": ["Sitara Sarees.json", "The Saari Girl.json"],
    "georgette saree": ["Sitara Sarees.json", "The Saari Girl.json"],
    "banarasi saree": ["Sitara Sarees.json", "The Saari Girl.json"],
    "kanjivaram saree": ["Sitara Sarees.json", "The Saari Girl.json"],
    "linen saree": ["Sitara Sarees.json", "The Saari Girl.json"],
    "net saree": ["Sitara Sarees.json", "The Saari Girl.json"],
    "organza saree": ["Sitara Sarees.json", "The Saari Girl.json"],
    "printed saree": ["Sitara Sarees.json", "The Saari Girl.json"],
    "embroidered saree": ["Sitara Sarees.json", "The Saari Girl.json"],
    "party wear saree": ["Sitara Sarees.json", "The Saari Girl.json"],
    "wedding saree": ["Sitara Sarees.json", "The Saari Girl.json"],
    "handloom saree": ["Sitara Sarees.json", "The Saari Girl.json"],
    "tissue saree": ["Sitara Sarees.json", "The Saari Girl.json"],
    "crepe saree": ["Sitara Sarees.json", "The Saari Girl.json"],
    "velvet saree": ["Sitara Sarees.json", "The Saari Girl.json"],
    "satin saree": ["Sitara Sarees.json", "The Saari Girl.json"]
}



# =========================
# YOLO Detection Helper
# =========================
def detect_image_type(image, conf=0.3):
    """
    Returns: "animal" | "person" | "clothes" | None
    """
    results = yolo_model(image)
    for r in results:
        if r.boxes is None:
            continue
        for box in r.boxes:
            cls_id = int(box.cls[0])
            label = yolo_model.names[cls_id]
            confidence = box.conf[0].item()
            if confidence < conf:
                continue
            if label in REJECT_CLASSES:
                return "animal"
            if label == "person":
                return "person"
            if label in ["hanger"]:
                return "clothes"
    return None

# =========================
# CLIP Gender Check (Female Only)
# =========================
def is_female_person_clip(image, threshold=0.55):
    """
    Returns True if CLIP predicts female, False otherwise.
    """
    gender_prompts = [
        "a photo of a woman wearing clothes",
        "a photo of a man wearing clothes"
    ]
    inputs = clip_processor(
        text=gender_prompts,
        images=image,
        return_tensors="pt",
        padding=True
    ).to(device)
    outputs = clip_model(**inputs)
    probs = outputs.logits_per_image.softmax(dim=1)[0]
    female_prob = probs[0].item()
    male_prob = probs[1].item()
    return female_prob > male_prob and female_prob >= threshold

# =========================
# CLIP Outfit Prediction
# =========================
def predict_labels_clip(image, min_conf=0.15):
    inputs = clip_processor(text=ALL_LABELS, images=image, return_tensors="pt", padding=True).to(device)
    outputs = clip_model(**inputs)
    probs = outputs.logits_per_image.softmax(dim=1)[0]
    top_probs, top_ids = torch.topk(probs, k=10)
    clothing = []
    match_labels = []
    for prob, idx in zip(top_probs, top_ids):
        label = ALL_LABELS[idx]
        confidence = prob.item()
        match_labels.append(label)
        if label in CLOTHING_ITEMS and confidence >= min_conf:
            clothing.append(label)
        if len(clothing) == 2:
            break
    return clothing, match_labels

# =========================
# Label Weight
# =========================
def get_label_weight(label):
    if label in CLOTHING_ITEMS:
        return 3
    if label in PATTERNS:
        return 1
    return 0

# =========================
# Upload & Match API
# =========================
@app.route("/upload", methods=["POST"])
def upload_and_match():
    try:
        file = request.files.get("file")
        if not file:
            return jsonify({"error": "No file uploaded"}), 400

        file_bytes = file.read()
        image = Image.open(BytesIO(file_bytes)).convert("RGB")

        # ---- Upload to Supabase ----
        filename = f"{uuid.uuid4().hex}.jpg"
        supabase.storage.from_("user_uploads").upload(filename, file_bytes)
        public_url = supabase.storage.from_("user_uploads").get_public_url(filename)

        # ---- YOLO Detection ----
        image_type = detect_image_type(image)

        # ---- Animals ----
        if image_type == "animal":
            return jsonify({
                "uploaded_image_url": public_url,
                "error": "Oops! VogueSphere is all about girls’ fashion 💖 Animals can’t get outfit recommendations."
            }), 200

        # ---- Person → Check Gender ----
        if image_type == "person":
            if not is_female_person_clip(image):
                return jsonify({
                    "uploaded_image_url": public_url,
                    "error": "VogueSphere currently recommends outfits for girls only 💗"
                }), 200

        # ---- No valid detection ----
        if image_type is None:
            return jsonify({
                "uploaded_image_url": public_url,
                "error": "Please upload a photo of a girl or clothes on a hanger so we can suggest stylish outfits ✨"
            }), 200

        # ---- CLIP Outfit Detection (Female / Hanger) ----
        frontend_labels, match_labels = predict_labels_clip(image)

        if not frontend_labels:
            return jsonify({
                "uploaded_image_url": public_url,
                "error": "Outfit detected but type could not be identified."
            }), 400

        # ---- Load Products ----
        all_products = []
        used_files = set()
        for label in frontend_labels:
            for file_name in LABEL_TO_FILES.get(label, []):
                if file_name not in used_files:
                    used_files.add(file_name)
                    data = download_json_from_bucket("scrape-data", file_name)
                    if data:
                        data = json.loads(data) if isinstance(data, str) else data
                        all_products.extend(data.get("products", []))

        # ---- Match Products ----
        matched_products = []
        for product in all_products:
            score = 0
            for pred_lbl in match_labels:
                for prod_lbl in product.get("labels", []):
                    sim = fuzz.partial_ratio(pred_lbl.lower(), prod_lbl.lower())
                    if sim >= 65:
                        score += sim * get_label_weight(pred_lbl)
            if score > 0:
                product["score"] = score
                matched_products.append(product)

        if not matched_products:
            return jsonify({
                "uploaded_image_url": public_url,
                "predicted_labels": frontend_labels,
                "matched_products": []
            })

        max_score = max(p["score"] for p in matched_products)
        results = [{
            "title": p.get("title"),
            "image": p.get("image"),
            "link": p.get("link"),
            "price": p.get("price"),
            "brand": p.get("brand", "Unknown"),
            "match_percent": round((p["score"] / max_score) * 100, 2)
        } for p in matched_products]

        results = sorted(results, key=lambda x: x["match_percent"], reverse=True)[:20]

        return jsonify({
            "uploaded_image_url": public_url,
            "predicted_labels": frontend_labels,
            "matched_products": results
        })

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

# =========================
# Run Server
# =========================
if __name__ == "__main__":
    app.run(debug=True, port=5001)
