from sqlalchemy.orm import Session
from models import Item
import crud
from utils.ai_match import match_items


def run_ai_match_for_new_item(new_item: Item, db: Session):
    if new_item.status == "LOST":
        lost_items = [new_item]
        found_items = db.query(Item).filter(
            Item.business_id == new_item.business_id,
            Item.status == "FOUND"
        ).all()

    elif new_item.status == "FOUND":
        found_items = [new_item]
        lost_items = db.query(Item).filter(
            Item.business_id == new_item.business_id,
            Item.status == "LOST"
        ).all()

    else:
        return []

    matches = match_items(lost_items, found_items)

    saved = []
    for m in matches:
        if not crud.get_match_by_items(db, m["lost_item_id"], m["found_item_id"]):
            saved.append(
                crud.create_match(
                    db,
                    m["lost_item_id"],
                    m["found_item_id"],
                    m["similarity_score"]
                )
            )

    return saved
