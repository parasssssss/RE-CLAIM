import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import crud, models
from database import get_db


router=APIRouter(prefix="/onboarding", tags=["Onboarding"])

@router.post("/onboarding/start")
def start_onboarding(payload: dict, db: Session = Depends(get_db)):
    token = str(uuid.uuid4())

    reg = models.BusinessRegistration(
        registration_token=token,
        business_name=payload["business"]["name"],
        address=payload["business"]["address"],
        contact_email=payload["business"]["email"],
        business_code=payload["business"]["business_code"],  # ✅ new field
        admin_name=payload["admin"]["name"],
        admin_email=payload["admin"]["email"],
        admin_password_hash=crud.get_password_hash(payload["admin"]["password"]),
        status="PAID"
    )

    db.add(reg)
    db.commit()

    return {
        "registration_token": token
    }



@router.post("/onboarding/complete")
def complete_onboarding(token: str, db: Session = Depends(get_db)):

    reg = db.query(models.BusinessRegistration).filter_by(
        registration_token=token
    ).first()

    if not reg or reg.status != "PAID":
        raise HTTPException(status_code=400, detail="Invalid or unpaid registration")

    if reg.status == "COMPLETED":
        raise HTTPException(status_code=400, detail="Onboarding already completed")

    # Get admin role
    admin_role = db.query(models.Role).filter_by(role_name="admin").first()
    if not admin_role:
        raise HTTPException(status_code=500, detail="Admin role not configured")

    # Create Business with business_code
    business = models.Business(
        business_name=reg.business_name,
        address=reg.address,
        contact_email=reg.contact_email,
        business_code=reg.business_code  # ✅ new field
    )
    db.add(business)
    db.flush()  # get business_id without commit

    # Create Admin User (NO re-hashing)
    admin = models.User(
        first_name=reg.admin_name,
        email=reg.admin_email,
        password_hash=reg.admin_password_hash,
        business_id=business.business_id,
        role_id=admin_role.role_id
    )
    db.add(admin)

    # Mark completed
    reg.status = "COMPLETED"

    db.commit()

    return {
        "message": "Business & Admin created successfully",
        "business_code": business.business_code
    }

