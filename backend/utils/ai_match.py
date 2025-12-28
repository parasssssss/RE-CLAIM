from sentence_transformers import SentenceTransformer, util
from typing import List

# Load model once
model = SentenceTransformer('all-MiniLM-L6-v2')

def create_item_text(item) -> str:
    """Combine all relevant fields into a single string for embedding"""
    return f"{item.item_type or ''}, Brand: {item.brand or ''}, Color: {item.color or ''}, Lost At: {item.lost_location or ''}, Description: {item.description or ''}"

def match_items(lost_items: List, found_items: List, threshold: float = 0.65):
    matches = []

    # Prepare texts
    lost_texts = [create_item_text(item) for item in lost_items]
    found_texts = [create_item_text(item) for item in found_items]

    # Encode all items in batch
    lost_embs = model.encode(lost_texts, convert_to_numpy=True, normalize_embeddings=True)
    found_embs = model.encode(found_texts, convert_to_numpy=True, normalize_embeddings=True)

    # Compute cosine similarity matrix
    cosine_scores = util.cos_sim(lost_embs, found_embs).numpy()  # shape [len(lost), len(found)]

    # Extract matches above threshold
    for i, lost_item in enumerate(lost_items):
        for j, found_item in enumerate(found_items):
            score = cosine_scores[i][j]
            if score >= threshold:
                matches.append({
                    "lost_item_id": lost_item.item_id,
                    "found_item_id": found_item.item_id,
                    "similarity_score": float(score)
                })

    return matches
