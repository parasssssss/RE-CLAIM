from fastapi import APIRouter, Depends, HTTPException
from scipy import stats
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from sqlalchemy import func, desc
from database import get_db
from models import User, Item, Match, Notification

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, or_
from datetime import datetime, timedelta
from typing import List
from auth import get_current_user
import models, auth
from database import get_db

router = APIRouter()

@router.get("/api/dashboard/{user_id}")
def get_dashboard(user_id: int, db: Session = Depends(get_db)):

    # --- User Check ---
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        return {"error": "User not found"}

    now = datetime.utcnow()
    
    # --- Time Ranges ---
    yesterday = now - timedelta(days=1)
    y_start = yesterday.replace(hour=0, minute=0, second=0, microsecond=0)
    y_end = yesterday.replace(hour=23, minute=59, second=59, microsecond=999999)
    
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    # --- Stats: Overview ---
    # Total active reports
    active_reports = db.query(Item).filter(
        Item.user_id == user_id, 
        Item.status.in_(["LOST", "PENDING"])
    ).count()

    # Total items recovered (All time)
    total_recovered = db.query(Item).filter(
        Item.user_id == user_id, 
        Item.status == "RECLAIMED"
    ).count()

    # Matches found today
    matches_today = db.query(Match).join(Item, Match.lost_item_id == Item.item_id).filter(
        Item.user_id == user_id,
        Match.created_at >= today_start
    ).count()

    # --- Recent Data (For Lists) ---
    
    # 1. Recent Matches (Top 5)
    recent_matches_query = db.query(Match).join(Item, Match.lost_item_id == Item.item_id)\
        .filter(Item.user_id == user_id)\
        .order_by(Match.created_at.desc())\
        .limit(5).all()

    recent_matches_data = []
    for m in recent_matches_query:
        # Fetch the found item details for context
        found_item = db.query(Item).filter(Item.item_id == m.found_item_id).first()
        recent_matches_data.append({
            "match_id": m.match_id,
            "similarity": m.similarity_score,
            "status": m.status,
            "item_name": found_item.item_type if found_item else "Unknown Item",
            "date": m.created_at.strftime("%b %d")
        })

    # 2. Recent Reports (Top 5)
    recent_reports = db.query(Item).filter(
        Item.user_id == user_id
    ).order_by(Item.created_at.desc()).limit(5).all()

    # --- Activity Chart Data (Last 7 Days) ---
    activity_data = []
    for i in range(6, -1, -1):
        day = now - timedelta(days=i)
        d_start = day.replace(hour=0, minute=0, second=0)
        d_end = day.replace(hour=23, minute=59, second=59)
        
        count = db.query(Item).filter(
            Item.user_id == user_id, 
            Item.created_at >= d_start, 
            Item.created_at <= d_end
        ).count()
        
        activity_data.append({
            "date": day.strftime("%a"), # Mon, Tue
            "count": count
        })

    return {
        "stats": {
            "active_reports": active_reports,
            "matches_today": matches_today,
            "total_recovered": total_recovered
        },
        "recent_matches": recent_matches_data,
        "recent_reports": [
            {
                "item_id": i.item_id,
                "name": i.item_type,
                "status": i.status,
                "date": i.created_at.strftime("%b %d")
            } for i in recent_reports
        ],
        "activity_chart": activity_data
    }


@router.get("/admin-stats")
def get_admin_dashboard_stats(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    # Security: Ensure only Admin (2) or Staff (3) access this
    if current_user.role_id not in [2, 3] or not current_user.business_id:
        return {"error": "Unauthorized"}

    bid = current_user.business_id

    # --- KPI 1: Active "In Custody" Items (Storage) ---
    # We count items uploaded by this business that are NOT yet returned
    # Assuming statuses like 'FOUND', 'PENDING' imply they are still in storage.
    storage_count = db.query(models.Item).filter(
        models.Item.business_id == bid,
        models.Item.status == "FOUND"  # Adjust if you use "LOGGED"
    ).count()

    # --- KPI 2: Pending Match Verifications ---
    # Matches involving this business's items that are waiting for approval
    pending_claims = db.query(models.Match).join(
        models.Item, models.Match.found_item_id == models.Item.item_id
    ).filter(
        models.Item.business_id == bid,
        models.Match.status == "PENDING"
    ).count()

    # --- KPI 3: Staff Members ---
    staff_count = db.query(models.User).filter(
        models.User.business_id == bid,
        models.User.role_id == 3 
    ).count()

    # 4. ✅ KPI: Match Rate Calculation
    # Formula: (Returned Items / Total Items Logged) * 100
    total_items = db.query(models.Item).filter(models.Item.business_id == bid).count()
    returned_items = db.query(models.Item).filter(
        models.Item.business_id == bid, 
        models.Item.status == "RECLAIMED"
    ).count()

    match_rate = 0
    if total_items > 0:
        match_rate = round((returned_items / total_items) * 100)

    # --- FEED: Recent Activity ---
    # Using 'created_at' and 'item_type' from your models
    recent_items = db.query(models.Item).filter(
        models.Item.business_id == bid
    ).order_by(models.Item.created_at.desc()).limit(3).all()
    
    feed_data = []
    for item in recent_items:
        feed_data.append({
            "type": "ITEM_LOGGED",
            "text": f"New: {item.item_type}",
            "subtext": f"Location: {item.lost_location or 'Unknown'}",
            "time": item.created_at
        })

    # --- CHART: Last 7 Days Intake ---
    # Using 'created_at'
    today = datetime.utcnow().date()
    chart_labels = []
    chart_data = []
    
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        count = db.query(models.Item).filter(
            models.Item.business_id == bid,
            func.date(models.Item.created_at) == day
        ).count()
        chart_labels.append(day.strftime("%b %d"))
        chart_data.append(count)

    return {
        "storage_count": storage_count,
        "pending_claims": pending_claims,
        "staff_count": staff_count,
        "returned_month": returned_items,
        "feed": feed_data,
        "chart": {
            "labels": chart_labels,
            "data": chart_data
        }
    }



# Add these imports if missing
from sqlalchemy import func, case
from datetime import datetime, timedelta

@router.get("/api/dashboard/staff/{user_id}")
def get_staff_dashboard(user_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    
    # Security: Ensure user is accessing their own data or is Admin
    if current_user.user_id != user_id and current_user.role_id != 2:
        raise HTTPException(status_code=403, detail="Unauthorized")

    # 1. --- STATS ---
    # CHANGED VARIABLE NAME FROM 'stats_query' TO 'stats_result' TO AVOID CONFUSION
    stats_result = db.query(
        func.count(case((models.Item.status == 'FOUND', 1))).label('active_found'),
        func.count(case((models.Item.status == 'RECLAIMED', 1))).label('recovered')
    ).filter(
        models.Item.user_id == user_id
    ).first()

    # Get count of matches specifically for items this staff member uploaded
    user_found_items_subquery = db.query(models.Item.item_id).filter(models.Item.user_id == user_id)
    
    matches_count = db.query(models.Match).filter(
        models.Match.found_item_id.in_(user_found_items_subquery)
    ).count()

    # 2. --- RECENT MATCHES (AI FEED) ---
    recent_matches_records = db.query(models.Match).filter(
        models.Match.found_item_id.in_(user_found_items_subquery)
    ).order_by(models.Match.created_at.desc()).limit(5).all()

    recent_matches_data = []
    for m in recent_matches_records:
        lost_item = db.query(models.Item).get(m.lost_item_id)
        recent_matches_data.append({
            "match_id": m.match_id,
            "item_name": lost_item.item_type if lost_item else "Unknown Item",
            "similarity": m.similarity_score,
            "date": m.created_at.strftime("%b %d")
        })

    # 3. --- RECENT LOGS ---
    recent_logs = db.query(models.Item).filter(
        models.Item.user_id == user_id
    ).order_by(models.Item.created_at.desc()).limit(5).all()

    recent_logs_data = []
    for item in recent_logs:
        recent_logs_data.append({
            "name": f"{item.color} {item.brand} {item.item_type}",
            "status": item.status,
            "date": item.created_at.strftime("%b %d")
        })

    # 4. --- CHART ---
    today = datetime.utcnow().date()
    chart_data = []
    
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        count = db.query(models.Item).filter(
            models.Item.user_id == user_id,
            func.date(models.Item.created_at) == day
        ).count()
        
        chart_data.append({
            "date": day.strftime("%a"),
            "count": count
        })

    return {
        "stats": {
            # FIX: Use stats_result instead of stats
            # We also add a check "if stats_result else 0" in case the user has 0 items
            "active_reports": getattr(stats_result, 'active_found', 0), 
            "total_recovered": getattr(stats_result, 'recovered', 0),   
            "matches_today": matches_count             
        },
        "recent_matches": recent_matches_data,
        "recent_reports": recent_logs_data,
        "activity_chart": chart_data
    }