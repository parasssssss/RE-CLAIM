from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from sqlalchemy import func, desc
from database import get_db
from auth import get_current_user
from models import User, Item, Match, Notification, BusinessSubscription


router = APIRouter(prefix="/subscriptions", tags=["Subscriptions"])


# Get subscription status
@router.get("/status")
def get_subscription_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    sub = db.query(BusinessSubscription).filter(
        BusinessSubscription.business_id == current_user.business_id
    ).first()

    if not sub:
        return {"status": "NONE", "days_left": 0}

    # Calculate remaining time
    now = datetime.utcnow()
    
    if now > sub.end_date:
        days_left = 0
        status = "EXPIRED"
    else:
        # Calculate delta
        delta = sub.end_date - now
        days_left = delta.days
        status = sub.status

    return {
        "plan_name": sub.plan.name, # Assumes relationship is set up
        "status": status,
        "days_left": days_left,
        "expires_on": sub.end_date
    }