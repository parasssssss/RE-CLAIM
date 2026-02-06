import os
import torch
from typing import List, Tuple
from PIL import Image
from sentence_transformers import SentenceTransformer, util
import open_clip  # NEW LIBRARY
from models import Item
import re



def extract_numbers(text):
    """Returns a set of all numbers found in the text string."""
    if not text: return set()
    # Finds all standalone numbers (e.g., "12" in "iPhone 12")
    return set(re.findall(r'\b\d+\b', str(text)))



# ==========================================
# 1. LOAD UPGRADED MODELS (CPU Optimized)
# ==========================================
print("Loading Advanced AI Models... (SigLIP + MPNet)")

# TEXT: Switch to MPNet (Better understanding of context than MiniLM)
text_model = SentenceTransformer("all-mpnet-base-v2", device='cpu')

# IMAGE: Switch to SigLIP (Better resolution 16x16 patch size vs old 32x32)
# This model connects text and images much more accurately.
clip_model, _, preprocess = open_clip.create_model_and_transforms('ViT-B-16-SigLIP', pretrained='webli')
tokenizer = open_clip.get_tokenizer('ViT-B-16-SigLIP')

INVALID_VALUES = {"test", "na", "n/a", "none", "", "unknown"}

def clean(value: str | None):
    if not value: return None
    v = value.strip().lower()
    return None if v in INVALID_VALUES else v

def create_item_text(item: Item) -> str:
    # Combine fields to give the text model rich context
    return f"{clean(item.brand) or ''} {clean(item.color) or ''} {clean(item.item_type) or ''} {clean(item.description) or ''}".strip()

# ==========================================
# 2. GENERATE VECTOR (Updated for SigLIP)
# ==========================================
def generate_image_embedding(image_path: str):
    """
    Generates embedding using the new SigLIP model.
    """
    if not image_path or not os.path.exists(image_path):
        return None
    try:
        image = preprocess(Image.open(image_path)).unsqueeze(0)  # Preprocess & Add batch dim
        with torch.no_grad():
            embedding = clip_model.encode_image(image)
            embedding /= embedding.norm(dim=-1, keepdim=True) # Normalize
        return embedding[0].tolist() # Return list for JSON storage
    except Exception as e:
        print(f"Error generating embedding: {e}")
        return None

# ==========================================
# 3. VALIDATE IMAGE (Updated to Zero-Shot)
# ==========================================
# ==========================================
# 3. VALIDATE IMAGE (DROPDOWN ENFORCER)
# ==========================================
def validate_image_content(image_path: str, user_category: str) -> Tuple[bool, str]:
    """
    Validates that the image actually belongs to the user's selected category 
    by comparing it against ALL available dropdown options.
    """
    print(f"\n--- 🔍 STRICT CATEGORY MATCHING ---")
    print(f"Path: {image_path}, User Selected: '{user_category}'")

    if not image_path or not user_category:
        return True, "No data"

    # 1. Define the "Universe" of your dropdown
    # We map your HTML values to lists of visual descriptions the AI understands.
    CATEGORY_DEFINITIONS = {
        "phone": ["a smartphone", "an iPhone", "an android phone", "a tablet", "an iPad"],
        "laptop": ["a laptop computer", "a macbook", "an open laptop", "a computer keyboard"],
        "electronics": ["headphones", "a camera", "a speaker", "a power bank", "a computer mouse", "electronic cables"],
        "watch": ["a wristwatch", "a smartwatch", "an apple watch", "a digital watch"],
        "jewelry": ["a ring", "a necklace", "earring", "a bracelet", "diamond jewelry", "gold jewelry"],
        "bag": ["a backpack", "a handbag", "a suitcase", "luggage", "a tote bag", "a shoulder bag"],
        "wallet": ["a wallet", "a purse", "a leather wallet", "a credit card holder"],
        "keys": ["a set of keys", "a car key", "a keychain", "metal keys"],
        "clothing": ["a shirt", "a jacket", "a coat", "shoes", "sneakers", "pants", "a dress"],
        "documents": ["an ID card", "a passport", "a driver license", "a paper document"],
        "accessories": ["eyeglasses", "sunglasses", "a hat", "a cap", "an umbrella", "a belt"],
        
        # 2. The "Catch-All" (Other)
        # We explicitly put "Water Bottle" and random items here. 
        # If the AI sees a bottle, it will pick 'other'. If user picked 'electronics', it fails. Perfect.
        "other": ["a water bottle", "a thermos", "food", "a toy", "a musical instrument", "a tool", "something else", "an object"]
    }

    # 3. Bad Quality Labels (To reject blur/darkness immediately)
    BAD_IMAGE_LABELS = ["blurred undefined noise", "a black screen", "solid color image"]

    # --- PREPARE DATA FOR AI ---
    
    # Flatten the dictionary into two lists:
    # all_labels = ["a smartphone", "a laptop", ...]
    # label_to_category_map = {"a smartphone": "phone", "a laptop": "laptop", ...}
    
    all_labels = []
    label_to_category_map = {}

    for cat_key, descriptions in CATEGORY_DEFINITIONS.items():
        for desc in descriptions:
            all_labels.append(desc)
            label_to_category_map[desc] = cat_key

    # Add bad labels (they map to 'invalid')
    for bad in BAD_IMAGE_LABELS:
        all_labels.append(bad)
        label_to_category_map[bad] = "invalid"

    try:
        # --- RUN AI PREDICTION (SigLIP) ---
        image = preprocess(Image.open(image_path)).unsqueeze(0)
        text = tokenizer(all_labels)

        with torch.no_grad():
            image_features = clip_model.encode_image(image)
            text_features = clip_model.encode_text(text)
            
            # Normalize
            image_features /= image_features.norm(dim=-1, keepdim=True)
            text_features /= text_features.norm(dim=-1, keepdim=True)

            # Calculate probabilities
            text_probs = (100.0 * image_features @ text_features.T).softmax(dim=-1)
        
        # --- ANALYZE RESULTS ---
        probs = text_probs[0].tolist()
        best_idx = probs.index(max(probs))
        
        best_label = all_labels[best_idx]
        predicted_category = label_to_category_map[best_label]
        confidence = probs[best_idx]

        print(f"🧐 AI sees: '{best_label}'")
        print(f"📊 Categorized as: '{predicted_category}' (Confidence: {confidence:.2%})")

        # --- DECISION LOGIC ---

        # Case 1: Image is garbage (Blurry/Black)
        if predicted_category == "invalid":
            return False, "Image is too blurry or unclear. Please upload a better photo."

        # Case 2: Exact Match
        if predicted_category == user_category:
            if confidence < 0.20: # Sanity check (20% is low but acceptable if many options exist)
                return True, "Match is weak, but accepted."
            return True, "Verified."

        # Case 3: Mismatch (The Logic You Wanted)
        else:
            # We enforce a threshold here. If the AI is wildly guessing (e.g. 5%), we might let it slide.
            # But if it is confident (>30%) that it is WRONG, we block it.
            if confidence > 0.30:
                # If user selected "Other", we are lenient. "Other" can essentially be anything.
                if user_category == "other":
                    return True, "Allowed under 'Other'."
                
                # If AI thinks it is "Other" (e.g. Bottle) but User said "Electronics" -> BLOCK.
                return False, f"You selected '{user_category}', but this image looks like '{predicted_category}' ({best_label})."
            
            else:
                # AI is confused (low confidence). We usually allow this to avoid frustrating users.
                return True, "Uncertain match, allowed."

    except Exception as e:
        print(f"Validation Error: {e}")
        return True, "Validation skipped due to error"


# ==========================================
# 4. MATCHING LOGIC (Smarter Scoring)
# ==========================================
def match_items(lost_items: List[Item], found_items: List[Item]):
    matches = []

    print("⚡ Running Smart Match...")

    for lost in lost_items:
        # Pre-compute Lost Text Embedding
        lost_text = create_item_text(lost)
        lost_text_emb = text_model.encode(lost_text, convert_to_tensor=True)

        for found in found_items:
            if lost.item_id == found.item_id: continue

            # 1. Text Similarity (MPNet)
            found_text = create_item_text(found)
            found_text_emb = text_model.encode(found_text, convert_to_tensor=True)
            text_score = util.cos_sim(lost_text_emb, found_text_emb).item()

            # 2. Image Similarity (SigLIP)
            image_score = 0.0
            has_image_match = False

            if lost.image_embedding and found.image_embedding:
                try:
                    # Convert stored lists back to Tensors
                    emb1 = torch.tensor(lost.image_embedding)
                    emb2 = torch.tensor(found.image_embedding)
                    
                    # SigLIP vectors are already normalized in generate_image_embedding
                    image_score = util.cos_sim(emb1, emb2).item()
                    has_image_match = True
                except:
                    pass 

            # 3. SMART SCORING LOGIC
            # If text is extremely high (User copied description), trust it.
            if text_score > 0.90:
                final_score = text_score
            # If image is extremely high (Exact visual match), trust it.
            elif has_image_match and image_score > 0.92:
                final_score = image_score
            # Otherwise, mix them. 
            elif has_image_match:
                # Give slightly more weight to Text because images can be misleading (lighting/angle)
                final_score = (text_score * 0.65) + (image_score * 0.35)
            else:
                final_score = text_score

           # 4. Boosters & Penalties (Smart Brand Logic)
            b_lost = clean(lost.brand)
            b_found = clean(found.brand)

            if b_lost and b_found:
                # Case A: Exact Match -> Boost Score
                if b_lost == b_found:
                    final_score += 0.05
                # Case B: Definite Mismatch -> Penalize Score
                elif b_lost not in b_found and b_found not in b_lost:
                    final_score -= 0.25

            # ---------------------------------------------------------
            # 🛡️ STRICT NUMBER CHECK (Distinguish Models like 12 vs 14)
            # ---------------------------------------------------------
            # 👇 THIS BLOCK MUST BE OUTSIDE THE 'if b_lost' BLOCK 👇
            
            # 1. Get numbers from Item Type + Description
            nums_lost = extract_numbers(f"{lost.item_type} {lost.description}")
            nums_found = extract_numbers(f"{found.item_type} {found.description}")

            # 2. Only run if BOTH items mention numbers
            if len(nums_lost) > 0 and len(nums_found) > 0:
                # 3. If they have NO numbers in common -> Penalty
                if not nums_lost.intersection(nums_found):
                    print(f"⚠️ Model Mismatch: {nums_lost} vs {nums_found}")
                    final_score -= 0.15  # Penalize score
            
            # 👆 END OF NEW BLOCK 👆



            # ---------------------------------------------------------
            # 🛡️ 4. SUFFIX/VARIANT CHECK (The "Pro" vs "Non-Pro" Guard)
            # ---------------------------------------------------------
            # Define words that change the model significantly
            # Comprehensive list of Tech Suffixes & Variants
            variants = {
                # 📱 Common Phone Suffixes
                "pro", "max", "plus", "ultra", "mini", "lite", "air", "se", "fe", "go",
                "prime", "zoom", "active", "sport", "stylus", "play", "power", 
                
                # 🔢 Single Letter Variants (Crucial for Pixel 6a, iPhone 6s, Redmi 9i, etc.)
                "s", "a", "c", "i", "e", "x", "t", "z", "gt", 
                
                # 💻 Laptop/Tablet specific
                "slim", "carbon", "yoga", "envy", "spectre", "alienware", "rog", "tuf", 
                "zenbook", "vivobook", "pavilion", "latitude", "precision", "xps",
                
                # ⌚ Wearables & Audio
                "classic", "frontier", "fit", "watch", "band", "buds", "pods", "nc", "tws",
                
                # 📐 Form Factors
                "fold", "flip", "edge", "curved", "note", "duos",
                
                # 🎮 Gaming/GPU (If someone loses a GPU/Console)
                "ti", "super", "oc", "oled", "digital"
            }
            
            # ---------------------------------------------------------
            # 🛡️ 4. SUFFIX/VARIANT CHECK (Strict Mode)
            # ---------------------------------------------------------
            
            # Helper to extract standalone variants AND attached ones (e.g., "6a" -> "a")
            def get_variants(text):
                if not text: return set()
                # 1. Clean and lowercase
                text = str(text).lower()
                # 2. Regex to split words AND separate numbers from letters
                # e.g., "iPhone 12Pro Max" -> ['iphone', '12', 'pro', 'max']
                # e.g., "Pixel 6a" -> ['pixel', '6', 'a']
                tokens = re.findall(r'[a-z]+|\d+', text)
                
                # 3. Return only tokens that are in our restricted 'variants' set
                return {t for t in tokens if t in variants}

            vars_lost = get_variants(f"{lost.item_type} {lost.description}")
            vars_found = get_variants(f"{found.item_type} {found.description}")

            # Only run if we have a high Base Score (matches the main item)
            if final_score > 0.85:
                # If one has a variant the other lacks -> PENALTY
                # e.g. Lost={'pro'}, Found=set() -> Penalty
                # e.g. Lost={'a'}, Found=set() (Pixel 6a vs 6) -> Penalty
                if vars_lost != vars_found:
                    print(f"⚠️ Variant Mismatch: {vars_lost} vs {vars_found}")
                    final_score -= 0.25  # Adjust to -0.25 if you want a HARD REJECT

            # Clamp Score (Ensure it stays between 0% and 100%)
            final_score = max(0.0, min(final_score, 1.0))
            
            # 5. Thresholds
            # We assume anything above 75% is a "Likely Match"
            if final_score >= 0.75:
                matches.append({
                    "lost_item_id": lost.item_id,
                    "found_item_id": found.item_id,
                    "similarity_score": float(final_score),
                    "status": "PENDING"
                })

    return matches

# ==========================================
# 5. VISUAL SEARCH (Updated for SigLIP)
# ==========================================
def encode_image(image_obj):
    """ Used by frontend for 'Search by Image' """
    try:
        image = preprocess(image_obj).unsqueeze(0)
        with torch.no_grad():
            embedding = clip_model.encode_image(image)
            embedding /= embedding.norm(dim=-1, keepdim=True)
        return embedding # Return Tensor
    except Exception as e:
        print(f"Error encoding: {e}")
        return None

def find_visual_matches(query_embedding, candidates: List, top_k=5):
    valid_candidates = []
    candidate_embeddings = []

    # Filter invalid candidates
    for item in candidates:
        if hasattr(item, 'image_embedding') and item.image_embedding:
            valid_candidates.append(item)
            candidate_embeddings.append(item.image_embedding)

    if not valid_candidates: return []

    # Stack embeddings
    try:
        candidate_matrix = torch.tensor(candidate_embeddings) # List of lists -> Tensor
    except:
        return []

    # Calculate Cosine Similarity
    # query_embedding is a Tensor [1, 768], candidate_matrix is [N, 768]
    scores = util.cos_sim(query_embedding, candidate_matrix)[0]

    scored_results = []
    for idx, score_tensor in enumerate(scores):
        score_val = score_tensor.item()
        
        if score_val > 0.65: # SigLIP is stricter, so 0.65 is a good visual match
            item = valid_candidates[idx]
            scored_results.append({
                "item_id": item.item_id,
                "name": item.item_type,
                "description": item.description,
                "image_url": getattr(item, 'image_path', ""), 
                "match_confidence": f"{int(score_val * 100)}%",
                "raw_score": score_val,
                "location": getattr(item, 'lost_location', "Unknown")
            })

    scored_results.sort(key=lambda x: x['raw_score'], reverse=True)
    return scored_results[:top_k]