import math
import torch
import torchvision.transforms as T
from PIL import Image
from sentence_transformers import SentenceTransformer, util,CrossEncoder
import re
import cv2
import numpy as np
import urllib.request
from torchvision.models import resnet18, ResNet18_Weights
from sklearn.metrics.pairwise import cosine_similarity



# =========================================================
# 1. LOAD "LEVEL 3" MODELS (The Upgraded Brains)
# =========================================================
print("⚡ Loading Enhanced AI Models (DINOv2 + MPNet)...")

# TEXT MODEL: MPNet is still excellent, but you can swap string to 'thenlper/gte-base' if you want.
# We stick to MPNet here for reliability.
text_model = SentenceTransformer("all-mpnet-base-v2", device='cpu')

# IMAGE MODEL: DINOv2 (Facebook Research) - Best-in-class for object geometry.
# We load the 'vits14' (Small) version. It is fast and accurate.
dinov2_model = torch.hub.load('facebookresearch/dinov2', 'dinov2_vits14')
dinov2_model.eval()  # Set to evaluation mode (no training)


# ✅ ADD THIS BLOCK: Load the "Judge" Model
print("⚖️ Loading Cross-Encoder (The Judge)...")
# This model is small (~80MB) but very smart at comparing two specific sentences
cross_encoder = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')


# DINOv2 Image Pre-processing (Standard ImageNet transforms)
dinov2_transforms = T.Compose([
    T.Resize(256, interpolation=T.InterpolationMode.BICUBIC),
    T.CenterCrop(224),
    T.ToTensor(),
    T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])

# =========================================================
# 2. HELPER FUNCTIONS (Logic & Cleaning)
# =========================================================

def clean(text):
    """Standardizes text for comparison."""
    if not text: return ""
    return re.sub(r'[^a-zA-Z0-9\s]', '', str(text).lower().strip())

def extract_numbers(text):
    """Finds all standalone numbers in text (e.g. '12' in 'iPhone 12')."""
    if not text: return set()
    return set(re.findall(r'\b\d+\b', str(text)))

def create_item_text(item):
    """Combines fields into a single rich text string for the AI."""
    # We weight the 'Type' and 'Brand' heavily by repeating them or putting them first
    return f"{item.item_type} {item.brand} {item.color} {item.description}".strip()

def is_same_category(type1, type2):
    """
    Smart Synonym Check. 
    Prevents 'Mobile' from being penalized against 'Phone'.
    """
    t1, t2 = clean(type1), clean(type2)
    if t1 == t2: return True
    if t1 in t2 or t2 in t1: return True # "Smart Phone" vs "Phone"

    synonyms = [
        {"phone", "mobile", "cell", "iphone", "android", "smartphone"},
        {"laptop", "computer", "macbook", "notebook", "pc", "chromebook"},
        {"tablet", "ipad", "kindle", "tab"},
        {"audio", "headphone", "earbud", "airpod", "headset", "speaker"},
        {"wallet", "purse", "billfold", "cardholder"},
        {"bag", "backpack", "suitcase", "luggage", "totebag"},
        {"keys", "key", "keyfob", "fob"},
        {"id", "passport", "license", "card", "badge"}
    ]

    for group in synonyms:
        if t1 in group and t2 in group:
            return True
    return False


def is_generic_description(text):
    """
    Detects non-unique / mass-produced descriptions.
    """
    if not text:
        return True

    GENERIC_TERMS = {
        "black", "white", "wired", "wireless", "earphones", "headphones",
        "charger", "cable", "usb", "type", "wallet", "bag",
        "found", "near", "bus", "stop", "road", "station"
    }

    words = set(clean(text).split())
    informative_words = words - GENERIC_TERMS

    # If very few meaningful words → generic
    return len(informative_words) <= 2

def description_detail_mismatch(lost_desc, found_desc):
    """
    Penalizes when found item has extra unique details
    not mentioned in lost description.
    """
    lost_words = set(clean(lost_desc).split())
    found_words = set(clean(found_desc).split())

    UNIQUE_FEATURES = {
        "mic", "microphone", "volume", "button", "buttons",
        "scratch", "scratched", "crack", "broken",
        "missing", "damaged", "torn", "cut"
    }

    found_features = found_words & UNIQUE_FEATURES
    lost_features = lost_words & UNIQUE_FEATURES

    # Found mentions features that lost does not
    unmatched = found_features - lost_features

    if unmatched:
        return 0.75  # reduce confidence by 25%
    
    return 1.0


# =========================================================
# 3. CORE FUNCTIONS (The ones your Routes call)
# =========================================================

def generate_image_embedding(image_path: str):
    """
    Generates a DINOv2 embedding for the image.
    Returns: List[float] (standard JSON-serializable list)
    """
    if not image_path:
        return None
    
    try:
        # 1. Load and Transform
        img = Image.open(image_path).convert('RGB')
        img_tensor = dinov2_transforms(img).unsqueeze(0)  # Add batch dimension

        # 2. Forward Pass (No Grad for speed)
        with torch.no_grad():
            # DINOv2 returns a dictionary or tensor depending on version. 
            # We want the 'CLS' token or the raw output.
            output = dinov2_model(img_tensor)
        
        # 3. Flatten and Convert to List
        # Output shape is [1, 384] for vits14
        embedding = output[0].tolist()
        return embedding

    except Exception as e:
        print(f"❌ Error generating DINOv2 embedding: {e}")
        return None


def match_items(lost_items, found_items):
    matches = []

    VARIANTS = {"mini", "pro", "promax", "max", "plus"}

    for lost in lost_items:
        lost_desc = clean(lost.description)
        lost_desc_emb = text_model.encode(lost_desc, convert_to_tensor=True)

        for found in found_items:
            # -----------------------------
            # 1. CATEGORY GATE (STRICT)
            # -----------------------------
            if lost.item_type.lower() != found.item_type.lower():
                continue

            found_desc = clean(found.description)
            found_desc_emb = text_model.encode(found_desc, convert_to_tensor=True)

            # -----------------------------
            # 2. DESCRIPTION SIMILARITY (PRIMARY – SOFT GATE)
            # -----------------------------
            desc_score = util.cos_sim(lost_desc_emb, found_desc_emb).item()

            if desc_score < 0.20:
                continue

            # -----------------------------
            # 3. CROSS-ENCODER (DESCRIPTION ONLY)
            # -----------------------------
            pair = [lost_desc, found_desc]
            logit = cross_encoder.predict(pair)
            desc_score = 1 / (1 + math.exp(-logit))

            if desc_score < 0.40:
                continue

            # -----------------------------
            # 4. GENERIC DESCRIPTION PENALTY
            # -----------------------------
            if is_generic_description(lost.description):
                desc_score *= 0.75

            if is_generic_description(found.description):
                desc_score *= 0.80

            # -----------------------------
            # 5. BASE SCORE = DESCRIPTION (DOMINANT)
            # -----------------------------
            final_score = desc_score * 0.70

            # -----------------------------
            # 6. BRAND BOOST (SECOND PRIORITY)
            # -----------------------------
            if lost.brand and found.brand:
                if lost.brand.lower() == found.brand.lower():
                    final_score += 0.15
                else:
                    final_score -= 0.05

            # -----------------------------
            # 7. COLOR BOOST (SMALL)
            # -----------------------------
            if lost.color and found.color:
                if lost.color.lower() == found.color.lower():
                    final_score += 0.05

            # -----------------------------
            # 🚫 8. MODEL NUMBER MISMATCH PENALTY (CRITICAL)
            # -----------------------------
            lost_nums = extract_numbers(lost.description)
            found_nums = extract_numbers(found.description)

            if lost_nums and found_nums and lost_nums != found_nums:
                final_score *= 0.55   # strong downgrade (e.g. 13 vs 14)

            # -----------------------------
            # 🚫 9. VARIANT MISMATCH PENALTY (Pro / Pro Max / Mini)
            # -----------------------------
            lost_words = set(lost_desc.split())
            found_words = set(found_desc.split())

            lost_variants = lost_words & VARIANTS
            found_variants = found_words & VARIANTS

            if lost_variants and found_variants and lost_variants != found_variants:
                final_score *= 0.65

            # -----------------------------
            # 10. IMAGE SIMILARITY (OPTIONAL SUPPORT)
            # -----------------------------
            image_score = 0.0
            if lost.image_embedding and found.image_embedding:
                try:
                    lost_img = torch.tensor(lost.image_embedding)
                    found_img = torch.tensor(found.image_embedding)
                    image_score = util.cos_sim(lost_img, found_img).item()
                    final_score += image_score * 0.10
                except:
                    pass

            # -----------------------------
            # 11. LOCATION BOOST (WEAK)
            # -----------------------------
            if (
                hasattr(lost, "location") and hasattr(found, "location") and
                lost.location and found.location and
                lost.location.lower() == found.location.lower()
            ):
                final_score += 0.05

            # -----------------------------
            # 12. EXACT IMAGE MATCH OVERRIDE
            # -----------------------------
            if image_score > 0.85 and verify_exact_match(lost, found):
                final_score = min(final_score + 0.20, 0.99)

            # -----------------------------
            # 13. FINAL CLAMP & THRESHOLD
            # -----------------------------
            final_score = max(0.0, min(final_score, 0.99))

            if final_score >= 0.60:
                matches.append({
                    "lost_item_id": lost.item_id,
                    "found_item_id": found.item_id,
                    "similarity_score": round(final_score, 4)
                })

    return matches


# ... (Previous code: DINOv2 loading, transforms, and match_items function) ...

# =========================================================
# 4. FRONTEND SEARCH FUNCTIONS (Search by Image)
# =========================================================

def encode_image(image_obj):
    """
    Used by frontend for 'Search by Image'.
    Converts a PIL Image into a DINOv2 embedding tensor.
    """
    try:
        # Ensure image is RGB (DINOv2 expects 3 channels)
        if image_obj.mode != "RGB":
            image_obj = image_obj.convert("RGB")
            
        # 1. Transform using the DINOv2 transforms we defined earlier
        # Shape becomes [1, 3, 224, 224]
        image_tensor = dinov2_transforms(image_obj).unsqueeze(0)
        
        # 2. Forward Pass
        with torch.no_grad():
            output = dinov2_model(image_tensor)
        
        # Output is [1, 384] (for vits14). 
        # We return the Tensor directly for cosine calc.
        return output 
        
    except Exception as e:
        print(f"❌ Error encoding search image: {e}")
        return None


def find_visual_matches(query_embedding, candidates: list, top_k=5):
    valid_candidates = []
    candidate_embeddings = []

    expected_dim = query_embedding.shape[1]  # 384

    for item in candidates:
        emb = getattr(item, 'image_embedding', None)
        if emb and len(emb) == expected_dim:
            valid_candidates.append(item)
            candidate_embeddings.append(emb)

    if not valid_candidates:
        return []

    candidate_matrix = torch.tensor(candidate_embeddings)

    scores = util.cos_sim(query_embedding, candidate_matrix)[0]

    scored_results = []
    for idx, score_tensor in enumerate(scores):
        score_val = score_tensor.item()

        if score_val > 0.60:
            item = valid_candidates[idx]
            scored_results.append({
                "item_id": item.item_id,
                "name": item.item_type,
                "description": item.description,
                "image_url": getattr(item, 'image_path', ""),
                "match_confidence": f"{int(score_val * 100)}%",
                "raw_score": score_val,
                "location": getattr(item, 'lost_location', "Unknown"),
                "status": item.status
            })

    scored_results.sort(key=lambda x: x['raw_score'], reverse=True)
    return scored_results[:top_k]


def verify_exact_match(img_path1, img_path2):
    """
    Verifies if two images are of the EXACT same physical object 
    by matching unique features (scratches, patterns, edges).
    
    Returns: True if strong match, False otherwise.
    """
    try:
        # 1. Load Images in Grayscale (Better for feature detection)
        # Handle both local paths and URLs
        def load_img(path):
            if path.startswith("http"):
                req = urllib.request.urlopen(path)
                arr = np.asarray(bytearray(req.read()), dtype=np.uint8)
                return cv2.imdecode(arr, cv2.IMREAD_GRAYSCALE)
            return cv2.imread(path, cv2.IMREAD_GRAYSCALE)

        img1 = load_img(img_path1)
        img2 = load_img(img_path2)

        if img1 is None or img2 is None: return False

        # 2. Initialize ORB Detector (The "Fingerprint Scanner")
        orb = cv2.ORB_create(nfeatures=1000)

        # 3. Find Keypoints and Descriptors
        kp1, des1 = orb.detectAndCompute(img1, None)
        kp2, des2 = orb.detectAndCompute(img2, None)

        if des1 is None or des2 is None: return False

        # 4. Match Features using Brute Force with Hamming Distance
        bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
        matches = bf.match(des1, des2)

        # 5. Sort matches by distance (Best matches first)
        matches = sorted(matches, key=lambda x: x.distance)

        # 6. Strict Verification Logic
        # We look at the top 10% of matches. 
        # If their distance is very low, it's the same object.
        top_n = max(1, int(len(matches) * 0.15))
        good_matches = matches[:top_n]
        
        # Calculate average distance of best matches (Lower is better)
        if not good_matches: return False
        avg_dist = sum(m.distance for m in good_matches) / len(good_matches)

        # THRESHOLD: 
        # < 30: Almost identical images
        # < 50: Same object, different angle/lighting
        # > 60: Different objects
        print(f"🔍 Feature Verification Dist: {avg_dist:.2f} (Matches: {len(good_matches)})")
        
        return avg_dist < 55.0

    except Exception as e:
        print(f"⚠️ Verification Error: {e}")
        return False
    

# =========================================================
# 6. CATEGORY VALIDATION (REPLACEMENT FOR CLIP)
# =========================================================

# Load a tiny standard classifier (ResNet18) for category checking
# This is independent of DINOv2. It just knows 1000 common objects.
try:
    classifier_weights = ResNet18_Weights.DEFAULT
    classifier_model = resnet18(weights=classifier_weights)
    classifier_model.eval()
    classifier_transforms = classifier_weights.transforms()
    print("✅ Loaded ResNet18 for Category Validation")
except Exception as e:
    print(f"⚠️ Could not load Classifier: {e}")
    classifier_model = None

def validate_image_content(image_path: str, user_category: str) -> tuple[bool, str]:
    """
    Validates that the image roughly matches the user's selected category.
    Uses ResNet18 (ImageNet) to predict the object class.
    """
    if not image_path or not user_category or classifier_model is None:
        return True, "Skipped"

    # 1. Standardize User Category
    user_cat = user_category.lower().strip()
    
    # 2. Define Mappings (ImageNet Class IDs -> Your Dropdown Options)
    # These are partial string matches for ImageNet labels
    VALID_KEYWORDS = {
        "phone": ["phone", "cellular", "mobile", "hand-held", "ipod"],
        "laptop": ["laptop", "notebook", "computer", "keyboard", "screen", "monitor"],
        "electronics": ["camera", "lens", "mouse", "speaker", "radio", "player", "cable", "device"],
        "watch": ["watch", "clock", "stopwatch", "timepiece"],
        "jewelry": ["ring", "necklace", "bracelet", "earring", "gold", "diamond"],
        "bag": ["bag", "backpack", "satchel", "purse", "suitcase", "luggage", "wallet"],
        "wallet": ["wallet", "purse", "billfold"],
        "keys": ["key", "lock", "metal"], # ImageNet is bad at keys, but we try
        "clothing": ["shirt", "jersey", "coat", "jacket", "shoe", "pant", "dress", "jean", "cloth"],
        "accessories": ["glass", "hat", "cap", "helmet", "umbrella", "belt"],
        "other": [] # Always allow
    }

    # If category isn't in our list (e.g. "Documents"), skip strict check
    if user_cat not in VALID_KEYWORDS and user_cat != "other":
        return True, "Category not strictly enforced"

    try:
        # 3. Load and Predict
        img = Image.open(image_path).convert('RGB')
        batch = classifier_transforms(img).unsqueeze(0)

        with torch.no_grad():
            prediction = classifier_model(batch).squeeze(0).softmax(0)
        
        # Get Top 3 Predictions
        class_id = prediction.argmax().item()
        score = prediction[class_id].item()
        category_name = classifier_weights.meta["categories"][class_id]
        
        # Get Top 3 for logging
        top3_indices = torch.topk(prediction, 3).indices.tolist()
        top3_names = [classifier_weights.meta["categories"][i] for i in top3_indices]
        
        print(f"🧐 AI sees: {top3_names} (Conf: {score:.2%})")

        # 4. Decision Logic
        
        # If confidence is very low (< 5%), the image is likely weird/blurry. 
        # We let it slide to avoid blocking valid but weird photos.
        if score < 0.05:
            return True, "Low confidence match allowed."

        # If user selected "Other", allow anything.
        if user_cat == "other":
            return True, "Allowed."

        # Check if ANY of the top 3 predictions match our keywords
        is_match = False
        allowed_keywords = VALID_KEYWORDS.get(user_cat, [])
        
        for pred_name in top3_names:
            for keyword in allowed_keywords:
                if keyword in pred_name.lower():
                    is_match = True
                    break
            if is_match: break

        if is_match:
            return True, "Verified."
        
        # 5. Strict Rejection Logic
        # Only reject if we are reasonably sure it's WRONG
        # e.g. User says "Laptop" but AI sees "Water Bottle" with 40% confidence.
        if score > 0.20:
             return False, f"This looks like a '{top3_names[0]}', not a '{user_category}'."
        
        return True, "Uncertain match, allowed."

    except Exception as e:
        print(f"❌ Validation Error: {e}")
        return True, "Error skipped"


# =========================================================
# 6. EXACT FEATURE MATCHER (The "Google Lens" Logic)
# =========================================================

def verify_exact_match(img_path1: str, img_path2: str) -> bool:
    """
    Compares two images looking for EXACT unique features (scratches, logos, patterns).
    Returns True if they are physically the same object.
    """
    try:
        # Helper to load image from Local Path or URL
        def load_image(path):
            if path.startswith("http"):
                req = urllib.request.urlopen(path)
                arr = np.asarray(bytearray(req.read()), dtype=np.uint8)
                return cv2.imdecode(arr, cv2.IMREAD_GRAYSCALE)
            return cv2.imread(path, cv2.IMREAD_GRAYSCALE)

        # 1. Load images in Grayscale
        img1 = load_image(img_path1)
        img2 = load_image(img_path2)

        if img1 is None or img2 is None:
            return False

        # 2. Initialize ORB Detector
        orb = cv2.ORB_create(nfeatures=1000)

        # 3. Find Keypoints
        kp1, des1 = orb.detectAndCompute(img1, None)
        kp2, des2 = orb.detectAndCompute(img2, None)

        if des1 is None or des2 is None:
            return False

        # 4. Match features (Brute Force Hamming)
        bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
        matches = bf.match(des1, des2)

        # 5. Filter & Score
        matches = sorted(matches, key=lambda x: x.distance)
        
        # Take top 15% of matches
        top_n = max(1, int(len(matches) * 0.15))
        good_matches = matches[:top_n]

        if len(good_matches) < 5: 
            return False # Not enough data

        avg_dist = sum(m.distance for m in good_matches) / len(good_matches)

        print(f"🔍 Feature Verification Dist: {avg_dist:.2f} (Matches: {len(good_matches)})")

        # THRESHOLD: Lower is better. < 50 is usually a specific object match.
        return avg_dist < 50.0

    except Exception as e:
        print(f"⚠️ Feature Verification Failed: {e}")
        return False