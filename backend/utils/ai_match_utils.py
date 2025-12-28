from sqlalchemy.orm import Session
from models import Item
import crud  # your CRUD functions
from utils.ai_match import match_items  # your existing match logic

def run_ai_match_for_new_item(new_item: Item, db: Session, threshold: float = 0.65):
    """
    Run AI matching for a new LOST or FOUND item.
    Only matches this item to the opposite status in the same business.
    Avoids duplicate matches.
    """
    if new_item.status == "LOST":
        opposite_items = db.query(Item).filter(
            Item.business_id == new_item.business_id,
            Item.status == "FOUND"
        ).all()
        lost_items = [new_item]
        found_items = opposite_items
    elif new_item.status == "FOUND":
        opposite_items = db.query(Item).filter(
            Item.business_id == new_item.business_id,
            Item.status == "LOST"
        ).all()
        lost_items = opposite_items
        found_items = [new_item]
    else:
        return []

    # Run AI matching
    matches = match_items(lost_items, found_items, threshold=threshold)

    saved_matches = []
    for m in matches:
        # Avoid duplicates
        exists = crud.get_match_by_items(db, m["lost_item_id"], m["found_item_id"])
        if not exists:
            saved_match = crud.create_match(
                db, m["lost_item_id"], m["found_item_id"], m["similarity_score"]
            )
            saved_matches.append(saved_match)

    return saved_matches
