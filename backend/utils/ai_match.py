from sentence_transformers import SentenceTransformer, util
from PIL import Image
import os
from typing import List, Tuple
from models import Item

# 1. Load Models (Force CPU)
print("Loading AI Models... (This may take a moment on startup)")
text_model = SentenceTransformer("all-MiniLM-L6-v2", device='cpu')
clip_model = SentenceTransformer('clip-ViT-B-32', device='cpu') 

INVALID_VALUES = {"test", "na", "n/a", "none", ""}

# Common categories for the 'Consistency Check'
CATEGORY_KEYWORDS = {
    "phone": ["smartphone", "iphone", "android phone", "tablet", "ipad"],
    "laptop": ["laptop", "macbook", "computer keyboard", "computer screen"],
    "electronics": ["headphones", "camera", "speaker", "charger", "power bank", "mouse"],
    "watch": ["wrist watch", "smartwatch", "apple watch"],
    "jewelry": ["diamond ring", "gold necklace", "earrings", "bracelet"],
    "bag": ["backpack", "handbag", "suitcase", "luggage", "tote bag"],
    "wallet": ["leather wallet", "purse", "credit card holder"],
    "keys": ["car keys", "house keys", "keychain", "metal keys"],
    "clothing": ["shirt", "jacket", "shoes", "sneakers", "pants", "hat"],
    "documents": ["passport", "id card", "driver license", "paper document"],
    "accessories": ["glasses", "sunglasses", "hat", "umbrella"],
    "other": ["object", "item"] # Generic fallback
}

COMMON_GUESS_LIST = [
    "smartphone", "laptop", "water bottle", "cat", "dog", "keys", 
    "wallet", "backpack", "watch", "shoes", "glasses", "passport",
    "headphones", "camera", "chair", "table", "food", "nothing"
]

def clean(value: str | None):
    if not value: return None
    v = value.strip().lower()
    return None if v in INVALID_VALUES else v

def create_item_text(item: Item) -> str:
    return f"""
    {clean(item.item_type) or ''}
    {clean(item.brand) or ''}
    {clean(item.color) or ''}
    {clean(item.description) or ''}
    """.strip()

# ✅ 1. Generate Vector for DB Storage
def generate_image_embedding(image_path: str):
    if not image_path or not os.path.exists(image_path):
        return None
    try:
        img = Image.open(image_path)
        embedding = clip_model.encode(img, convert_to_tensor=False)
        return embedding.tolist() # Convert to list for JSON storage
    except Exception as e:
        print(f"Error generating embedding: {e}")
        return None

# ✅ 2. Check if Image Matches Description (Consistency Check)
def validate_image_content(image_path: str, user_category: str) -> Tuple[bool, str]:
    print(f"\n--- 🔍 DEBUG AI CHECK ---")
    print(f"Path: {image_path}, Category: {user_category}")

    if not image_path or not user_category:
        return True, "No data"

    try:
        img = Image.open(image_path)
        
        # --- A. VERIFY CLAIM ---
        # Get specific keywords for the user's category (e.g., "laptop" -> ["macbook", "notebook"])
        # If category not in dict, default to just the category name
        keywords = CATEGORY_KEYWORDS.get(user_category.lower(), [user_category])
        
        # Compare image against ALL valid keywords for this category
        keyword_embs = clip_model.encode(keywords, convert_to_tensor=True)
        image_emb = clip_model.encode(img, convert_to_tensor=True)
        
        # Check similarity with all keywords and take the BEST match
        scores = util.cos_sim(image_emb, keyword_embs)[0]
        best_match_score = scores.max().item()
        
        print(f"📉 Validation Score (Best match for '{user_category}'): {best_match_score:.4f}")

        # Threshold: 0.22 is a good balance for CLIP
        if best_match_score > 0.22: 
            print("✅ Match Accepted")
            return True, "Match verified"

        # --- B. GUESS WHAT IT IS (If mismatch) ---
        print("⚠️ Low score. Trying to guess object...")
        
        # Fix: Use the FLAT list of strings, not the dictionary!
        guess_embs = clip_model.encode(COMMON_GUESS_LIST, convert_to_tensor=True)
        guess_scores = util.cos_sim(image_emb, guess_embs)[0]
        
        best_guess_idx = guess_scores.argmax().item()
        best_guess_score = guess_scores[best_guess_idx].item()
        predicted_object = COMMON_GUESS_LIST[best_guess_idx]
        
        print(f"🤖 AI Guess: '{predicted_object}' with score {best_guess_score:.4f}")

        # Only warn if the AI is somewhat confident in its guess
        if best_guess_score > 0.25:
            return False, f"Warning: You selected '{user_category}', but this looks like a '{predicted_object}'."
            
        print("⛔ No specific guess, but score was low. Rejecting.")
        return False, "Image does not seem to match the selected category."

    except Exception as e:
        print(f"🔥 CRITICAL ERROR in AI Check: {e}")
        import traceback
        traceback.print_exc()
        return True, "Validation skipped"
    
# ✅ 3. Matching Logic (Text Fallback included)
def match_items(lost_items: List[Item], found_items: List[Item]):
    matches = []

    for lost in lost_items:
        lost_text = create_item_text(lost)
        lost_text_emb = text_model.encode(lost_text, convert_to_tensor=True)

        for found in found_items:
            if lost.item_id == found.item_id: continue

            # Text Score
            found_text = create_item_text(found)
            found_text_emb = text_model.encode(found_text, convert_to_tensor=True)
            text_score = util.cos_sim(lost_text_emb, found_text_emb).item()

            # Image Score
            image_score = 0.0
            has_image_match = False

            # Only compare images if BOTH exist
            if lost.image_embedding and found.image_embedding:
                try:
                    image_score = util.cos_sim(lost.image_embedding, found.image_embedding).item()
                    has_image_match = True
                except:
                    pass 

            # Weighted Score
            if has_image_match:
                # Strict Mode: Use both
                final_score = (text_score * 0.4) + (image_score * 0.6)
            else:
                # Flexible Mode: Trust text
                final_score = text_score

            # Boosts
            if clean(lost.color) == clean(found.color): final_score += 0.05
            if clean(lost.brand) == clean(found.brand): final_score += 0.05

            # Dynamic Threshold
            threshold = 0.60 if has_image_match else 0.70

            if final_score >= threshold:
                matches.append({
                    "lost_item_id": lost.item_id,
                    "found_item_id": found.item_id,
                    "similarity_score": float(final_score),
                    "status": "PENDING"
                })

    return matches