import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
from ultralytics import YOLO
from transformers import CLIPProcessor, CLIPModel
from PIL import Image
from io import BytesIO
import torch
import google.generativeai as genai

# =========================
# Flask Setup
# =========================
app = Flask(__name__)
CORS(app)

# =========================
# Gemini API
# =========================
genai.configure(api_key="replace with your API")  

# =========================
# Load Models
# =========================
yolo = YOLO("yolov8n.pt")
clip_model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
clip_processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")

# =========================
# Labels
# =========================
REJECT_CLASSES = ["dog", "cat", "horse", "cow", "sheep"]

CLOTHING_ITEMS = [
    # Jeans
    "skinny jeans", "straight jeans", "wide leg jeans", "bootcut jeans", "high waisted jeans",
    "ripped jeans", "cropped jeans", "jeans", "denims",
    # Pants / Trousers
    "trousers", "pants", "shorts", "leggings",
    # Jackets & Outerwear
    "denim jacket", "jacket", "coat", "blazer", "cardigan", "sweater", "hoodie",
    # Shirts
    "t-shirt", "casual shirt", "formal shirt", "collar shirt",
    "half sleeves shirt", "full sleeves shirt",
    # Tops
    "tank top", "tops", "casual top", "blouse",
    # Western Dresses
    "maxi dress", "dress", "western dress", "bodycon dress",
    "shirt dress", "summer dress", "party wear dress",
    "formal frock", "frock", "romper", "jumpsuit",
    # Eastern Wear
    "embroidered shalwar kameez", "printed kurti", "plain suit",
    "2 piece dress", "ready to wear", "party wear",
    "kurta", "shalwar kameez",
    # Bridal & Formal
    "wedding dress", "lehenga", "lehenga choli", "bridal lehenga",
    "anarkali", "floor length gown", "sharara suit", "gharara suit",
    "angrakha style dress", "long kameez with lehenga",
    "embroidered wedding dress", "designer wedding gown",
    # Saree
    "saree", "silk saree", "chiffon saree", "georgette saree",
    "banarasi saree", "kanjivaram saree","net saree", "organza saree","party wear saree", "wedding saree",
    "handloom saree", "tissue saree", "crepe saree", "velvet saree", "satin saree",
    # Skirt & Co-ord sets
    "skirt", "two piece skirt set", "co-ord set", "top and skirt"
]

PATTERNS = [
    "striped", "checked", "polka dot", "floral", "plain", "geometric", "animal print",
    "abstract", "solid", "embroidered", "printed", "digital printed", "floral print",
    "solid color", "tie-dye", "ombre", "lace", "sequined", "beaded"
]

COLORS = [
    "red", "blue", "green", "black", "white", "yellow", "pink", "purple", "orange", "brown", "grey",
    "navy", "maroon", "beige", "teal", "gold", "silver",
    "light blue", "dark blue", "sky blue", "indigo", "denim blue",
    "olive", "khaki", "mustard", "cream", "off white", "rust",
    "charcoal", "mint", "peach", "lavender"
]

FOOTWEAR = ["heels", "flats", "sandals", "sneakers", "khussa"]
ACCESSORIES = ["handbag", "scarf", "dupatta"]
JEWELRY = ["earrings", "necklace", "bangles", "rings", "maang tikka"]

# =========================
# Global variable for chat
# =========================
last_detected_items = {}

# =========================
# YOLO Person Crop
# =========================
def crop_person(image):
    results = yolo(image)
    for r in results:
        if r.boxes is None:
            continue
        for box in r.boxes:
            label = yolo.names[int(box.cls[0])]
            if label == "person":
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                return image.crop((x1, y1, x2, y2))
    return image  # fallback

# =========================
# Image Type Detection
# =========================
def detect_image_type(image, conf=0.3):
    results = yolo(image)
    for r in results:
        if r.boxes is None:
            continue
        for box in r.boxes:
            label = yolo.names[int(box.cls[0])]
            if box.conf[0].item() < conf:
                continue
            if label in REJECT_CLASSES:
                return "animal"
            if label == "person":
                return "person"
    return None

# =========================
# Female Check via CLIP
# =========================
def is_female_person_clip(image, threshold=0.55):
    prompts = ["a photo of a woman wearing clothes", "a photo of a man wearing clothes"]
    inputs = clip_processor(images=image, text=prompts, return_tensors="pt", padding=True)
    with torch.no_grad():
        probs = clip_model(**inputs).logits_per_image.softmax(dim=1)[0]
    return probs[0] > probs[1] and probs[0] >= threshold

# =========================
# Fashion Detection
# =========================
def detect_fashion_items(image):
    detected = {}
    image = crop_person(image)

    def detect_category(labels, threshold=0.25):
        inputs = clip_processor(images=image, text=labels, return_tensors="pt", padding=True)
        with torch.no_grad():
            probs = clip_model(**inputs).logits_per_image.softmax(dim=1)[0]
        idx = torch.argmax(probs).item()
        score = probs[idx].item()
        if score >= threshold:
            return {"label": labels[idx], "score": round(score, 3)}
        return None

    detected["clothing_item"] = detect_category(CLOTHING_ITEMS)
    detected["pattern"] = detect_category(PATTERNS, threshold=0.2)
    detected["color"] = detect_category(COLORS, threshold=0.2)
    detected["footwear"] = detect_category(FOOTWEAR)
    detected["accessories"] = detect_category(ACCESSORIES)
    detected["jewelry"] = detect_category(JEWELRY)

    # Remove None categories
    detected = {k: v for k, v in detected.items() if v is not None}

    return detected

# # =========================
# # Color Coordination & Rating
# # =========================
# def calculate_color_coordination_score(detected_items):
#     score = 30  # realistic base

#     # ---- REQUIRED ITEMS BONUS ----
#     required_items = ["clothing_item", "color"]
#     for item in required_items:
#         if item in detected_items:
#             score += 10
#         else:
#             score -= 15  # missing essential item

#     # ---- OPTIONAL ITEMS BONUS ----
#     optional_items = ["pattern", "footwear", "accessories", "jewelry"]
#     score += 5 * sum(item in detected_items for item in optional_items)

#     # ---- CONFIDENCE IMPACT ----
#     avg_conf = sum(v["score"] for v in detected_items.values()) / len(detected_items)
#     score += int((avg_conf - 0.5) * 20)  # low confidence → penalty

#     # ---- COLOR PENALTY ----
#     colors = detected_items.get("color", {}).get("labels", [])
#     if len(colors) > 3:
#         score -= 10  # too many colors = noisy outfit

#     # ---- PATTERN + COLOR CLASH ----
#     if "pattern" in detected_items and len(colors) > 2:
#         score -= 5  # pattern + too many colors

#     return max(0, min(score, 100))



# =========================
# Gemini Prompt Builder
# =========================
def build_gemini_prompt(detected_items):
    clothing = detected_items.get("clothing_item", {}).get("label", "unknown")
    pattern = detected_items.get("pattern", {}).get("label", "none")
    color = detected_items.get("color", {}).get("label", "unknown")
    footwear = detected_items.get("footwear", {}).get("label", "none")
    accessories = detected_items.get("accessories", {}).get("label", "none")
    jewelry = detected_items.get("jewelry", {}).get("label", "none")

    return f"""
You are a professional female fashion stylist.

Detected outfit:
Clothing Item: {clothing}
Pattern: {pattern}
Color: {color}
Footwear: {footwear}
Accessories: {accessories}
Jewelry: {jewelry}

Analyze the uploaded outfit image. Detect items such as clothing type, color, patterns, footwear, accessories, and hairstyle. 
Give concise and practical advice in 4–5 lines based ONLY on detected items. 
Include outfit vibe, color coordination, footwear choice, hairstyle, and accessory balance. 

Also, rate the overall outfit out of 5 and give a color coordination score out of 5. 
If the color coordination is not good, provide specific suggestions to improve it. 

"""

# =========================
# /ai-feedback Endpoint
# =========================
@app.route("/ai-feedback", methods=["POST"])
def ai_feedback():
    global last_detected_items

    image_url = request.json.get("image_url")
    if not image_url:
        return jsonify({"error": "Image URL required"}), 400

    try:
        img = Image.open(BytesIO(requests.get(image_url, timeout=10).content)).convert("RGB")
    except:
        return jsonify({"error": "Image load failed"}), 400

    image_type = detect_image_type(img)
    if image_type == "animal":
        return jsonify({"error": "Invalid image"}), 400
    if image_type != "person":
        return jsonify({"error": "No person detected"}), 400

    if not is_female_person_clip(img):
        return jsonify({"error": "Only female outfits supported"}), 400

    detected_items = detect_fashion_items(img)
    if not detected_items:
        return jsonify({"error": "Outfit unclear"}), 400

    last_detected_items = detected_items

    
    

    prompt = build_gemini_prompt(detected_items)
    response = genai.GenerativeModel("gemini-2.5-flash").generate_content(prompt)

    return jsonify({
        "detected_items": detected_items,
        # "color_coordination_score": color_score,
        
        "feedback": response.text.strip()
    })

# =========================
# /stylist-chat Endpoint
# =========================
@app.route("/stylist-chat", methods=["POST"])
def stylist_chat():
    global last_detected_items
    data = request.get_json()
    user_message = data.get("message", "")

    if not last_detected_items:
        return jsonify({"reply": "Please upload an outfit first so I know what style you are asking about."})

    clothing = last_detected_items.get("clothing_item", {}).get("label", "unknown")
    pattern = last_detected_items.get("pattern", {}).get("label", "none")
    color = last_detected_items.get("color", {}).get("label", "unknown")
    footwear = last_detected_items.get("footwear", {}).get("label", "none")
    accessories = last_detected_items.get("accessories", {}).get("label", "none")
    jewelry = last_detected_items.get("jewelry", {}).get("label", "none")

    system_prompt = f"""
You are a professional female fashion stylist.
The user is currently wearing: Clothing Item: {clothing}, Pattern: {pattern}, Color: {color}, Footwear: {footwear}, Accessories: {accessories}, Jewelry: {jewelry}.
Only answer questions related to fashion, outfits, shoes, hairstyle, accessories, and color matching.
If asked unrelated questions, politely reply: "Sorry, I can only help with fashion and styling advice."
"""

    model = genai.GenerativeModel("gemini-2.5-flash")
    response = model.generate_content(system_prompt + "\nUser: " + user_message)

    return jsonify({"reply": response.text.strip()})

# =========================
# Run Server
# =========================
if __name__ == "__main__":
    app.run(debug=True, port=5000)
