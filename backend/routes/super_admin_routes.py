from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, extract
from typing import List, Optional
import datetime

import models, schemas
from database import get_db
from auth import get_current_user

router = APIRouter(prefix="/super-admin", tags=["Super Admin"])

# --- 🔒 SECURITY: SUPER ADMIN ONLY ---
def require_super_admin(current_user: models.User = Depends(get_current_user)):
    if current_user.role_id != 1:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="⛔ ACCESS DENIED: Platform Command clearance required."
        )
    return current_user

# ==========================================
# 1. 📊 GLOBAL DASHBOARD KPIs (The Visuals)
# ==========================================

@router.get("/kpi/overview")
def get_dashboard_overview(
    db: Session = Depends(get_db), 
    _: models.User = Depends(require_super_admin)
):
    """
    Returns the 'Wall Street' metrics for the top cards.
    """
    # 1. MRR (Total from Payments where status='PAID' / 12 for avg or just total active subs)
    # Simple Calculation: Sum of all PAID payments in current month
    current_month = datetime.datetime.now().month
    monthly_revenue = db.query(func.sum(models.Payment.amount)).filter(
        models.Payment.status == "PAID",
        extract('month', models.Payment.created_at) == current_month
    ).scalar() or 0.0

    # 2. Total Users
    total_users = db.query(models.User).count()
    
    # 3. Match Success Rate (Matches RESOLVED / Total Matches)
    total_matches = db.query(models.Match).count()
    resolved_matches = db.query(models.Match).filter(
        models.Match.status.in_(["RECLAIMED"])
    ).count()
    
    success_rate = 0
    if total_matches > 0:
        success_rate = round((resolved_matches / total_matches) * 100, 1)

    # 4. AI Performance (Avg Similarity Score of accepted matches)
    avg_ai_score = db.query(func.avg(models.Match.similarity_score)).filter(
        models.Match.status != "REJECTED"
    ).scalar() or 0.0

    return {
        "monthly_revenue": monthly_revenue,
        "total_users": total_users,
        "match_success_rate": success_rate,
        "avg_ai_confidence": round(avg_ai_score * 100, 1) # Convert 0.85 to 85%
    }

@router.get("/kpi/revenue-chart")
def get_revenue_chart(
    db: Session = Depends(get_db), 
    _: models.User = Depends(require_super_admin)
):
    """
    Returns data for the Revenue Line Chart (Last 6 Months).
    """
    # Group payments by Month
    # Note: Logic depends on DB (Postgres/SQLite). This is generic SQLAlchemy.
    # For MVP, we might just return dummy data or simple distinct counts
    
    # Simple query fetching last 6 months revenue
    results = db.query(
        extract('month', models.Payment.created_at).label('month'),
        func.sum(models.Payment.amount).label('total')
    ).filter(
        models.Payment.status == "PAID"
    ).group_by('month').all()

    return [{"month": r.month, "revenue": r.total} for r in results]

@router.get("/kpi/categories")
def get_category_distribution(
    db: Session = Depends(get_db), 
    _: models.User = Depends(require_super_admin)
):
    """
    Returns data for the Category Pie Chart.
    """
    results = db.query(
        models.Item.item_type,
        func.count(models.Item.item_id).label('count')
    ).group_by(models.Item.item_type).limit(5).all()

    return [{"label": r.item_type, "count": r.count} for r in results]


# ==========================================
# 2. 🏢 TENANT MANAGEMENT (The Registry)
# ==========================================

@router.get("/businesses")
def get_all_businesses(
    db: Session = Depends(get_db), 
    _: models.User = Depends(require_super_admin)
):
    """
    List all businesses with calculated stats (Plan, Usage, Status).
    """
    businesses = db.query(models.Business).all()
    response = []

    for b in businesses:
        # Get Subscription Info
        sub = db.query(models.BusinessSubscription).filter(
            models.BusinessSubscription.business_id == b.business_id,
            models.BusinessSubscription.status == 'ACTIVE'
        ).first()
        
        plan_name = sub.plan.name if sub and sub.plan else "Free/None"
        
        # Get Usage (Item Count)
        item_count = db.query(models.Item).filter(models.Item.business_id == b.business_id).count()
        
        # Get Admin Info
        admin = db.query(models.User).filter(
            models.User.business_id == b.business_id, 
            models.User.role_id == 2
        ).first()

        response.append({
            "id": b.business_id,
            "name": b.business_name,
            "code": b.business_code,
            "admin_email": admin.email if admin else "No Admin",
            "plan": plan_name,
            "items_reported": item_count,
            "is_active": b.is_active, # Requires the migration we discussed!
            "joined_at": b.created_at
        })
    
    return response

@router.post("/businesses/{business_id}/toggle-status")
def toggle_business_status(
    business_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_super_admin)
):
    """
    The 'Kill Switch'. Suspends or Unsuspends a business.
    """
    business = db.query(models.Business).filter(models.Business.business_id == business_id).first()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    
    # Toggle
    business.is_active = not business.is_active
    db.commit()
    
    status_msg = "Activated" if business.is_active else "Suspended"
    return {"message": f"Business {status_msg} successfully."}


# ==========================================
# 3. 👥 USER POLICE (Global User Ops)
# ==========================================

# In admin_routes.py

@router.get("/users")
def get_global_users(
    role_filter: Optional[int] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_super_admin)
):
    # ✅ CHANGE: Join User with Business to get the 'business_code'
    query = db.query(models.User, models.Business.business_code)\
        .outerjoin(models.Business, models.User.business_id == models.Business.business_id)

    if role_filter:
        query = query.filter(models.User.role_id == role_filter)
    
    if search:
        query = query.filter(models.User.email.contains(search))

    results = query.limit(50).all()
    
    # ✅ Return both User data and the Business Code
    return [{
        "user_id": u.user_id,
        "email": u.email,
        "role_id": u.role_id,
        "business_id": u.business_id,
        "business_code": b_code, # <--- The new field we need
        "is_active": u.is_active,
        "last_login": u.last_login
    } for u, b_code in results]

@router.post("/users/{user_id}/ban")
def ban_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(require_super_admin)
):
    """
    Globally bans a user from the platform.
    """
    if user_id == current_admin.user_id:
        raise HTTPException(status_code=400, detail="You cannot ban yourself.")

    user = db.query(models.User).filter(models.User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_active = False
    db.commit()
    return {"message": f"User {user.email} has been banned."}

@router.put("/users/{user_id}/change-role")
def change_user_role(
    user_id: int,
    new_role_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_super_admin)
):
    """
    Promote/Demote a user (e.g., Make a Staff member an Admin).
    """
    user = db.query(models.User).filter(models.User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.role_id = new_role_id
    db.commit()
    return {"message": f"User role updated to {new_role_id}"}


# In admin_routes.py

@router.post("/users/{user_id}/toggle-ban")
def toggle_user_ban(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(require_super_admin)
):
    """
    New Endpoint: Checks current status and flips it (Active <-> Banned).
    """
    # 1. Prevent Admin from banning themselves
    if user_id == current_admin.user_id:
        raise HTTPException(status_code=400, detail="You cannot ban yourself.")

    # 2. Find User
    user = db.query(models.User).filter(models.User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # 3. Toggle Status
    # If True -> becomes False. If False -> becomes True.
    user.is_active = not user.is_active 
    
    db.commit()
    
    status_msg = "Activated" if user.is_active else "Banned"
    return {"message": f"User {user.email} has been {status_msg}"}