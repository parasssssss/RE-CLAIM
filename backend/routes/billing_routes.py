from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel

import models, auth
from database import get_db

router = APIRouter(prefix="/billing", tags=["Billing"])

# --- Schemas ---
class PlanResponse(BaseModel):
    plan_id: int
    name: str
    price: float
    features: Optional[str]
    duration_days: int

class SubscriptionResponse(BaseModel):
    plan_name: str
    status: str
    end_date: Optional[datetime]
    price: float

class PaymentHistoryResponse(BaseModel):
    payment_id: int
    date: datetime
    amount: float
    status: str
    description: str

# --- Endpoints ---

@router.get("/current", response_model=SubscriptionResponse)
def get_current_subscription(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Fetch the active subscription for the user's business.
    """
    if not current_user.business_id:
        raise HTTPException(status_code=400, detail="User not linked to a business")

    # Fetch active subscription
    sub = db.query(models.BusinessSubscription).filter(
        models.BusinessSubscription.business_id == current_user.business_id,
        models.BusinessSubscription.status == "ACTIVE"
    ).first()

    if not sub:
        # Default to Free if no active sub found
        return {
            "plan_name": "Free Tier",
            "status": "ACTIVE",
            "end_date": None,
            "price": 0.0
        }

    # Fetch plan details
    plan = db.query(models.SubscriptionPlan).filter(models.SubscriptionPlan.plan_id == sub.plan_id).first()
    
    return {
        "plan_name": plan.name if plan else "Unknown Plan",
        "status": sub.status,
        "end_date": sub.end_date,
        "price": plan.price if plan else 0.0
    }

@router.get("/plans", response_model=List[PlanResponse])
def get_available_plans(db: Session = Depends(get_db)):
    """
    List all available subscription plans for the pricing table.
    """
    plans = db.query(models.SubscriptionPlan).filter(models.SubscriptionPlan.is_active == True).all()
    return plans

@router.get("/history", response_model=List[PaymentHistoryResponse])
def get_payment_history(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Fetch payment history for the business.
    Since 'Payment' table uses registration_token, we might need to link it via business logic.
    For this MVP, we will assume we can query by business_id if we add it, 
    OR we filter by the user's email/admin credentials.
    """
    # Note: Logic here depends on how you link Payments to Businesses. 
    # Assuming we return a mock empty list or filter correctly if Payment has business_id.
    
    # Placeholder: Return empty list for now until Payment model is fully linked
    return []



# ✅ NEW: Schema for Upgrade Request
class UpgradeRequest(BaseModel):
    plan_id: int
    payment_id: str

# ✅ NEW: Endpoint to handle Upgrade Success
@router.post("/upgrade")
def upgrade_plan(
    data: UpgradeRequest,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Called by Frontend after a successful Razorpay payment.
    Updates the business subscription in the database.
    """
    if not current_user.business_id:
        raise HTTPException(status_code=400, detail="User is not linked to a business")

    # 1. Fetch the selected plan to get duration
    new_plan = db.query(models.SubscriptionPlan).filter(models.SubscriptionPlan.plan_id == data.plan_id).first()
    if not new_plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    # 2. Check for existing subscription
    existing_sub = db.query(models.BusinessSubscription).filter(
        models.BusinessSubscription.business_id == current_user.business_id,
        models.BusinessSubscription.status == "ACTIVE"
    ).first()

    # 3. Calculate Dates
    start_date = datetime.utcnow()
    end_date = start_date + timedelta(days=new_plan.duration_days)

    # 4. Update or Create Logic
    if existing_sub:
        # Option A: Update existing record
        existing_sub.plan_id = new_plan.plan_id
        existing_sub.payment_id = data.payment_id
        existing_sub.start_date = start_date
        existing_sub.end_date = end_date
        # existing_sub.status remains ACTIVE
    else:
        # Option B: Create new record
        new_sub = models.BusinessSubscription(
            business_id=current_user.business_id,
            plan_id=new_plan.plan_id,
            start_date=start_date,
            end_date=end_date,
            status="ACTIVE",
            payment_id=data.payment_id
        )
        db.add(new_sub)

    # 5. Log the Payment (Optional but recommended for history)
    # Since you have a Payment table, let's add a record there too
    payment_record = models.Payment(
        registration_token=str(current_user.business_id), # Using business_id as token reference
        razorpay_payment_id=data.payment_id,
        amount=new_plan.price,
        status="PAID",
        razorpay_order_id="DIRECT_JS" # Placeholder since we didn't use backend order
    )
    db.add(payment_record)

    db.commit()

    return {"status": "success", "plan": new_plan.name}



# In routers/billing_routes.py

@router.get("/history", response_model=List[PaymentHistoryResponse])
def get_payment_history(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user.business_id:
        return []
    
    # ✅ FIXED: Filter by the real business_id column
    payments = db.query(models.Payment).filter(
        models.Payment.business_id == current_user.business_id
    ).order_by(models.Payment.created_at.desc()).all()

    # Map database objects to the Response Schema
    history_list = []
    for p in payments:
        history_list.append({
            "payment_id": p.payment_id,
            "date": p.created_at,
            "amount": float(p.amount), # Ensure it's a number
            "status": p.status,
            "description": f"Subscription Payment #{p.payment_id}"
        })

    return history_list