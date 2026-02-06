import datetime
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import crud, models
from database import get_db


router=APIRouter(prefix="/onboarding", tags=["Onboarding"])


# ✅ NEW: API to fetch plans for the Landing Page
@router.get("/plans")
def get_subscription_plans(db: Session = Depends(get_db)):
    return db.query(models.SubscriptionPlan).filter(models.SubscriptionPlan.is_active == True).all()



# ✅ UPDATED: Start Onboarding (Now accepts plan_id)
@router.post("/onboarding/start")
def start_onboarding(payload: dict, db: Session = Depends(get_db)):
    token = str(uuid.uuid4())
    
    # Get plan ID from payload (Frontend must send this)
    plan_id = payload.get("plan_id")
    if not plan_id:
        raise HTTPException(status_code=400, detail="Plan ID is required")

    reg = models.BusinessRegistration(
        registration_token=token,
        business_name=payload["business"]["name"],
        address=payload["business"]["address"],
        contact_email=payload["business"]["email"],
        business_code=payload["business"]["business_code"],  
        admin_name=payload["admin"]["name"],
        admin_email=payload["admin"]["email"],
        admin_password_hash=crud.get_password_hash(payload["admin"]["password"]),
        selected_plan_id=plan_id,  # <--- Save selected plan
        status="PENDING" # Changed from PAID to PENDING until Razorpay confirms
    )

    db.add(reg)
    db.commit()

    return {"registration_token": token}




# ... (Keep your existing start_onboarding and get_plans endpoints) ...

# onboarding_routes.py

@router.post("/onboarding/complete")
def complete_onboarding(payload: dict, db: Session = Depends(get_db)):
    token = payload.get("token")
    payment_id = payload.get("payment_id") # Razorpay ID
    
    # 1. Validate Registration
    reg = db.query(models.BusinessRegistration).filter(
        models.BusinessRegistration.registration_token == token
    ).first()
    
    if not reg or reg.status == "COMPLETED":
        raise HTTPException(status_code=400, detail="Invalid or expired token")

    # 2. Create the Business
    business = models.Business(
        business_code=reg.business_code,
        business_name=reg.business_name,
        address=reg.address,
        contact_email=reg.contact_email,
        is_active=True
    )
    db.add(business)
    db.flush() # Flush to get business.business_id immediately

    # 3. Create the Admin User
    admin = models.User(
        first_name=reg.admin_name,
        email=reg.admin_email,
        password_hash=reg.admin_password_hash,
        business_id=business.business_id,
        role_id=2, # Admin Role
        is_active=True
    )
    db.add(admin)

    # 4. Handle Subscription & Payment History
    plan = db.query(models.SubscriptionPlan).filter(models.SubscriptionPlan.plan_id == reg.selected_plan_id).first()
    
    if plan:
        # A. TABLE 1: Set Current Active Subscription (Status)
        new_sub = models.BusinessSubscription(
            business_id=business.business_id,
            plan_id=plan.plan_id,
            start_date=datetime.datetime.utcnow(),
            end_date=datetime.datetime.utcnow() + datetime.timedelta(days=plan.duration_days),
            status="ACTIVE",
            payment_id=payment_id
        )
        db.add(new_sub)

        # ==========================================================
        # B. TABLE 2: Create Payment History Log (THE MISSING LINK)
        # ==========================================================
        if payment_id:
            history_log = models.Payment(
                registration_token=token,       
                business_id=business.business_id, # Link to the new business
                razorpay_payment_id=payment_id,
                razorpay_order_id="ONBOARDING",
                amount=plan.price,
                status="PAID",
                created_at=datetime.datetime.utcnow()
            )
            db.add(history_log)
        # ==========================================================

    # 5. Finalize
    reg.status = "COMPLETED"
    db.commit()

    return {"message": "Onboarding Complete", "business_id": business.business_id}