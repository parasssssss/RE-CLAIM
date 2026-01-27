from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from email_utils import notify_match_approved, notify_match_rejected
import models
from database import get_db
from auth import get_current_user

router = APIRouter(prefix="/admin", tags=["Admin"])




@router.post("/admin/approve-match/{match_id}")
def approve_match(
    match_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    if current_user.role_id != 2:
        raise HTTPException(status_code=403, detail="Admin access only")

    match = db.query(models.Match).filter(
        models.Match.match_id == match_id
    ).first()

    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    if match.status.lower() != "pending":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot approve a {match.status} match"
        )

    match.status = "APPROVED"
    db.commit()
    db.refresh(match)

    # 🎯 NOTIFY LOST ITEM OWNER (NORMAL USER)
    lost_item = db.get(models.Item, match.lost_item_id)
    user = db.get(models.User, lost_item.user_id)

    notify_match_approved(db, user, lost_item, match)

    return {
        "message": "Match approved successfully",
        "match_id": match_id,
        "status": "approved"
    }





@router.post("/admin/reject-match/{match_id}")
def reject_match(
    match_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    if current_user.role_id != 2:
        raise HTTPException(status_code=403, detail="Admin access only")

    match = db.query(models.Match).filter(
        models.Match.match_id == match_id
    ).first()

    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    if match.status.lower() != "pending":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot reject a {match.status} match"
        )

    match.status = "REJECTED"
    db.commit()
    db.refresh(match)

    # 🎯 NOTIFY LOST ITEM OWNER (NORMAL USER)
    lost_item = db.get(models.Item, match.lost_item_id)
    user = db.get(models.User, lost_item.user_id)

    notify_match_rejected(db, user, lost_item, match)

    return {
        "message": "Match rejected successfully",
        "match_id": match_id,
        "status": "rejected"
    }
