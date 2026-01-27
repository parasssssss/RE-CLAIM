from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import Notification, User
from schemas import NotificationOut
from auth import get_current_user  
router = APIRouter(prefix="/notifications", tags=["Notifications"])

# 1️⃣ Get unread notifications count
@router.get("/unread_count")
def unread_count(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    count = db.query(Notification).filter_by(user_id=current_user.user_id, is_read=False).count()
    return {"count": count}

# 2️⃣ Get latest notifications (dropdown)
@router.get("/latest", response_model=List[NotificationOut])
def latest_notifications(limit: int = 5, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    notifications = (
        db.query(Notification)
        .filter_by(user_id=current_user.user_id)
        .order_by(Notification.created_at.desc())
        .limit(limit)
        .all()
    )
    return notifications

# 3️⃣ Mark notification as read
@router.patch("/{notification_id}/read")
def mark_as_read(notification_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    notification = db.query(Notification).filter_by(notification_id=notification_id, user_id=current_user.user_id).first()
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    notification.is_read = True
    db.commit()
    return {"success": True}

# 4️⃣ Optional: mark all as read
@router.patch("/mark_all_read")
def mark_all_read(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db.query(Notification).filter_by(user_id=current_user.user_id, is_read=False).update({"is_read": True})
    db.commit()
    return {"success": True}
