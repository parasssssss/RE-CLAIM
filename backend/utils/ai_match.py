from sentence_transformers import SentenceTransformer, util
from typing import List
from models import Item  # make sure this matches your import path

# Load model once
model = SentenceTransformer('all-MiniLM-L6-v2')

def create_item_text(item: Item) -> str:
    """Combine all relevant fields into a single string for embedding"""
    return f"{item.item_type or ''}, Brand: {item.brand or ''}, Color: {item.color or ''}, Lost At: {item.lost_location or ''}, Description: {item.description or ''}"

def match_items(new_items: List[Item], all_items: List[Item], threshold: float = 0.65):
    """
    Match new items (could be lost or found) against existing opposite-status items.

    :param new_items: List of new items being added
    :param all_items: List of all existing items in DB
    :param threshold: Cosine similarity threshold to consider a match
    :return: List of match dictionaries with lost_item_id, found_item_id, similarity_score
    """
    matches = []

    if not new_items or not all_items:
        # Nothing to match
        return matches

    # Separate new items by status
    for new_item in new_items:
        opposite_status = "FOUND" if new_item.status == "LOST" else "LOST"

        # Filter existing items of opposite status
        candidates = [item for item in all_items if item.status == opposite_status]

        if not candidates:
            continue

        # Prepare texts
        new_texts = [create_item_text(new_item)]
        candidate_texts = [create_item_text(item) for item in candidates]

        # Encode
        new_embs = model.encode(new_texts, convert_to_numpy=True, normalize_embeddings=True)
        candidate_embs = model.encode(candidate_texts, convert_to_numpy=True, normalize_embeddings=True)

        # Compute cosine similarity
        cosine_scores = util.cos_sim(new_embs, candidate_embs).numpy()  # shape [1, len(candidates)]

        for j, candidate_item in enumerate(candidates):
            score = cosine_scores[0][j]
            if score >= threshold:
                match_dict = {}
                if new_item.status == "LOST":
                    match_dict = {
                        "lost_item_id": new_item.item_id,
                        "found_item_id": candidate_item.item_id,
                        "similarity_score": float(score)
                    }
                else:
                    match_dict = {
                        "lost_item_id": candidate_item.item_id,
                        "found_item_id": new_item.item_id,
                        "similarity_score": float(score)
                    }
                matches.append(match_dict)

    return matches
