from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from sqlalchemy import func
from database import get_db
from models import User, Item, Match

router = APIRouter()

@router.get("/api/dashboard/{user_id}")
def get_dashboard(user_id: int, db: Session = Depends(get_db)):

    # --- User ---
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        return {"error": "User not found"}

    now = datetime.utcnow()

    # --- Yesterday ---
    yesterday = now - timedelta(days=1)
    y_start = yesterday.replace(hour=0, minute=0, second=0, microsecond=0)
    y_end = yesterday.replace(hour=23, minute=59, second=59, microsecond=999999)

    items_yesterday = db.query(Item).filter(
        Item.user_id == user_id,
        Item.created_at >= y_start,
        Item.created_at <= y_end
    ).count()

    matches_yesterday = db.query(Match).join(Item, Match.lost_item_id == Item.item_id).filter(
        Item.user_id == user_id,
        Match.created_at >= y_start,
        Match.created_at <= y_end
    ).count()

    items_recovered_yesterday = db.query(Item).filter(
        Item.user_id == user_id,
        Item.status == "RECLAIMED",
        Item.updated_at >= y_start,
        Item.updated_at <= y_end
    ).count()

    # --- Today ---
    t_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_items = db.query(Item).filter(Item.user_id == user_id, Item.created_at >= t_start).all()
    today_reports_count = len(today_items)

    today_matches_count = db.query(Match).join(Item, Match.lost_item_id == Item.item_id).filter(
        Item.user_id == user_id,
        Match.created_at >= t_start
    ).count()

    today_recovered_count = db.query(Item).filter(
        Item.user_id == user_id,
        Item.status == "RECLAIMED",
        Item.updated_at >= t_start
    ).count()

    # --- Monthly stats (unchanged) ---
    start_month = datetime(now.year, now.month, 1)
    monthly_recoveries = db.query(Item).filter(
        Item.user_id == user_id,
        Item.status == "RECLAIMED",
        Item.updated_at >= start_month
    ).count()

    total_items_month = db.query(Item).filter(
        Item.user_id == user_id,
        Item.created_at >= start_month
    ).count()

    recovery_rate = round((monthly_recoveries / total_items_month * 100) if total_items_month else 0, 2)

    # --- Categories ---
    categories_query = db.query(Item.item_type, func.count(Item.item_id)).filter(Item.user_id == user_id).group_by(Item.item_type).all()
    categories = [{"category": c[0], "percentage": round(c[1]/total_items_month*100,2)} for c in categories_query]

    # --- Activity chart (last 7 days) ---
    activity_labels = []
    activity_data = []
    for i in range(7):
        day = now - timedelta(days=6-i)
        d_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
        d_end = day.replace(hour=23, minute=59, second=59, microsecond=999999)
        day_reported = db.query(Item).filter(Item.user_id==user_id, Item.created_at>=d_start, Item.created_at<=d_end).count()
        day_recovered = db.query(Item).filter(Item.user_id==user_id, Item.status=="RECLAIMED", Item.updated_at>=d_start, Item.updated_at<=d_end).count()
        activity_labels.append(day.strftime("%b %d"))
        activity_data.append({"items_reported": day_reported, "items_recovered": day_recovered})

    # --- Return JSON ---
    return {
        "yesterday": {
            "items_reported": items_yesterday,
            "matches_found": matches_yesterday,
            "items_recovered": items_recovered_yesterday
        },
        "today_reports": [{"item_type": i.item_type, "brand": i.brand, "status": i.status} for i in today_items],
        "today_stats": {
            "items_reported": today_reports_count,
            "matches_found": today_matches_count,
            "items_recovered": today_recovered_count
        },
        "monthly_recoveries": {"count": monthly_recoveries, "change": 4.33},  # keep monthly stats same
        "recovery_rate": {"current": recovery_rate, "change": -1.03},
        "categories": categories,
        "activity_overview": [
            {"date": activity_labels[i], "items_reported": activity_data[i]["items_reported"], "items_recovered": activity_data[i]["items_recovered"]} for i in range(7)
        ]
    }
