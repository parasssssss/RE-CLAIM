from typing import List
from sqlalchemy import or_
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import crud
from utils.ai_match import match_items
import models, schemas
from database import get_db
from auth import get_current_user

router = APIRouter(prefix="/matches", tags=["Matches"])



# Run AI Matching Endpoint
@router.post("/run-ai-matching/{business_id}")
def run_ai_matching(business_id: int, db: Session = Depends(get_db)):
    # Fetch LOST items for this business
    lost_items = db.query(models.Item).filter(models.Item.business_id == business_id, models.Item.status == "LOST").all()
    
    # Fetch FOUND items for this business
    found_items = db.query(models.Item).filter(models.Item.business_id == business_id, models.Item.status == "FOUND").all()
    
    # Run AI matching
    matches = match_items(lost_items, found_items, threshold=0.65)
    
    # Save matches to DB
    saved_matches = []
    for m in matches:
        saved_match = crud.create_match(db, m["lost_item_id"], m["found_item_id"], m["similarity_score"])
        saved_matches.append(saved_match)
    
    return {"total_matches": len(saved_matches), "matches": [{"lost": m.lost_item_id, "found": m.found_item_id, "score": m.similarity_score} for m in saved_matches]}


@router.get("/matches", response_model=List[schemas.MatchResponse])
def get_ai_matches(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    matches_query = db.query(models.Match).join(
        models.Item, models.Match.found_item_id == models.Item.item_id
    )

    if current_user.role_id == 4:  # normal user
        lost_items = db.query(models.Item.item_id).filter(
            models.Item.user_id == current_user.user_id
        ).subquery()
        matches_query = db.query(models.Match).filter(models.Match.lost_item_id.in_(lost_items))

    elif current_user.role_id == 3:  # staff
        matches_query = matches_query.filter(models.Item.user_id == current_user.user_id)

    matches = matches_query.all()

    result = []
    for match in matches:
        lost_item = db.query(models.Item).filter(models.Item.item_id == match.lost_item_id).first()
        found_item = db.query(models.Item).filter(models.Item.item_id == match.found_item_id).first()

        # ✅ Create notification only if it doesn't exist already
        existing_notif = db.query(models.Notification).filter_by(
            user_id=current_user.user_id,
            match_id=match.match_id,
            notification_type="MATCH_FOUND"
        ).first()

        if not existing_notif:
            from email_utils import notify_match_found
            notify_match_found(db, current_user, lost_item, match)

        result.append({
            "match_id": match.match_id,
            "similarity_score": match.similarity_score,
            "status": match.status,
            "lost": lost_item,
            "found": found_item,
            "created_at": match.created_at
        })

    return result



# Get Approved Matches (User + Staff)
@router.get("/approved-matches", response_model=List[schemas.MatchResponse])
def get_approved_matches(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Subquery: all item IDs belonging to current user
    user_item_ids = db.query(models.Item.item_id).filter(
        models.Item.user_id == current_user.user_id
    ).subquery()

    # Fetch approved matches involving user's items
    matches = db.query(models.Match).filter(
    or_(
        models.Match.status == "APPROVED",
        models.Match.status == "RECLAIMED"
    ),
    or_(
        models.Match.lost_item_id.in_(user_item_ids),
        models.Match.found_item_id.in_(user_item_ids)
    )
).order_by(models.Match.created_at.desc()).all()

    result = []
    for match in matches:
        lost_item = db.query(models.Item).get(match.lost_item_id)
        found_item = db.query(models.Item).get(match.found_item_id)

        result.append({
            "match_id": match.match_id,
            "similarity_score": match.similarity_score,
            "status": match.status,
            "lost": lost_item,
            "found": found_item,
            "created_at": match.created_at
        })

    return result


@router.get("/match/{match_id}", response_model=schemas.MatchResponse)
def get_single_match(
    match_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    match = db.query(models.Match).filter(models.Match.match_id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    # Security check: only allow user to access their own lost/found items
    lost_item = db.query(models.Item).filter(models.Item.item_id == match.lost_item_id).first()
    found_item = db.query(models.Item).filter(models.Item.item_id == match.found_item_id).first()
    
    if current_user.role_id == 4 and lost_item.user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    if current_user.role_id == 3 and found_item.user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    return {
        "match_id": match.match_id,
        "similarity_score": match.similarity_score,
        "status": match.status,
        "lost": lost_item,
        "found": found_item,
        "created_at": match.created_at
    }

