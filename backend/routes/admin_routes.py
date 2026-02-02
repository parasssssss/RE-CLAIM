from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session
from email_utils import create_notification, send_match_approved_task, send_match_rejected_task
import models
from database import get_db
from auth import get_current_user

router = APIRouter(prefix="/admin", tags=["Admin"])




@router.post("/admin/approve-match/{match_id}")
def approve_match(
    match_id: int,
    background_tasks: BackgroundTasks, # <--- 1. Inject BackgroundTasks
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

    # ✅ REFACTORED NOTIFICATION LOGIC
    # 1. Create DB Record (Sync)
    create_notification(
        db=db,
        user_id=user.user_id,
        item_id=lost_item.item_id,
        match_id=match.match_id,
        title="Match Approved",
        message="Great news! Your item match has been approved.",
        notification_type="MATCH_APPROVED"
    )

    # 2. Send Email (Async Background)
    background_tasks.add_task(
        send_match_approved_task,
        user_email=user.email,
        item_type=lost_item.item_type
    )

    return {
        "message": "Match approved successfully",
        "match_id": match_id,
        "status": "approved"
    }




@router.post("/admin/reject-match/{match_id}")
def reject_match(
    match_id: int,
    background_tasks: BackgroundTasks, # <--- 1. Inject BackgroundTasks
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

    # ✅ REFACTORED NOTIFICATION LOGIC
    # 1. Create DB Record (Sync)
    create_notification(
        db=db,
        user_id=user.user_id,
        item_id=lost_item.item_id,
        match_id=match.match_id,
        title="Match Rejected",
        message="Update: Your potential item match was not approved.",
        notification_type="MATCH_REJECTED"
    )

    # 2. Send Email (Async Background)
    background_tasks.add_task(
        send_match_rejected_task,
        user_email=user.email,
        item_type=lost_item.item_type
    )

    return {
        "message": "Match rejected successfully",
        "match_id": match_id,
        "status": "rejected"
    }