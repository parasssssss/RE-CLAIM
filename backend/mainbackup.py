import shutil
from typing import List
import uuid
from argon2 import hash_password
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File,Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from numpy import select
from sqlalchemy.orm import Session
from utils.ai_match_utils import run_ai_match_for_new_item
from utils.ai_match import match_items
from database import Base, engine, get_db
from auth import create_access_token,get_current_user
from datetime import timedelta
from email_utils import send_reset_email 
from fastapi import Body
from auth import decode_access_token,bearer_scheme
import crud,models,schemas
import os,razorpay
from fastapi.openapi.models import APIKey, APIKeyIn
from fastapi.openapi.utils import get_openapi
from sqlalchemy import or_





models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Reclaim API")

# Allow frontend origin
origins = ["*"]


app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema

    openapi_schema = get_openapi(
        title="ReClaim API",
        version="1.0.0",
        description="Lost & Found AI Matching API",
        routes=app.routes,  
    )

    openapi_schema["components"]["securitySchemes"] = {
        "BearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
        }
    }

   

    app.openapi_schema = openapi_schema
    return app.openapi_schema




#fetch User Details Endpoint
@app.get("/me", 
         response_model=schemas.UserOut,
         dependencies=[Depends(bearer_scheme)])
def read_current_user(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Fetch profile info
    profile = crud.get_profile_by_user_id(db, current_user.user_id)

    if not profile:
    # create empty profile object if it doesn't exist
        profile = schemas.EmptyProfile()

    return {
        "business_id": current_user.business_id,
        "user_id": current_user.user_id,
        "first_name": current_user.first_name,
        "email": current_user.email,
        "last_name": getattr(profile, "last_name", None),
        "phone": getattr(profile, "phone", None),
        "profile_image": getattr(profile, "profile_image", None),
        "profile_image_mime": getattr(profile, "profile_image_mime", None),
        "role_id": current_user.role_id
    }



# Registration Endpoint
@app.post("/register", response_model=schemas.UserOut)
def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):

    business = db.query(models.Business).filter(
        models.Business.business_code == user.business_code
    ).first()

    if not business:
        raise HTTPException(status_code=404, detail="Invalid business code")

    db_user = db.query(models.User).filter(
        models.User.email == user.email,
        models.User.business_id == business.business_id
    ).first()

    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered in this business")

    return crud.create_user(db, user, business.business_id)



# Login Endpoint
@app.post("/login")
def login_user(user: schemas.UserLogin, db: Session = Depends(get_db)):

    db_user = db.query(models.User).filter(
        models.User.email == user.email
    ).first()

    if not db_user or not crud.verify_password(user.password, db_user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({
        "sub": str(db_user.user_id),
        "business_id": db_user.business_id,
        "role_id": db_user.role_id
    })

    return {
        "access_token": token,
        "token_type": "bearer",
        "user_id": db_user.user_id,
        "role_id": db_user.role_id,
        "business_id": db_user.business_id
    }




# Forgot Password Endpoint
@app.post("/forgot-password")
def forgot_password(data: dict, db: Session = Depends(get_db)):
    email = data.get("email")
    user = crud.get_user_by_email(db, email)
    if not user:
        raise HTTPException(status_code=404, detail="Email not registered")

    # Generate reset token (15 min expiry)
    token = create_access_token({"sub": str(user.user_id)}, expires_delta=timedelta(minutes=15))
    reset_link = f"http://127.0.0.1:56311/frontend/reset_password.html?token={token}"

    # Send email
    send_reset_email(to_email=email, reset_link=reset_link)
    return {"message": "Reset link sent to your email."}


# Reset Password Endpoint
@app.post("/reset-password")
def reset_password(data: dict = Body(...), db: Session = Depends(get_db)):
    token = data.get("token")
    new_password = data.get("new_password")

    if not token or not new_password:
        raise HTTPException(status_code=400, detail="Token and password required")

    try:
        payload = decode_access_token(token)
        user_id = int(payload.get("sub"))
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user = crud.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Update password
    hashed_password = crud.get_password_hash(new_password)
    user.password_hash = hashed_password
    db.commit()

    return {"message": "Password reset successful"}

#profile Settings Endpoint
@app.put("/profile", response_model=schemas.ProfileOut)
def update_profile(
    data: schemas.ProfileBase,  # include profile_image & mime here
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    current_user.first_name=data.first_name
    current_user.email=data.email
    db.commit()
    db.refresh(current_user)


    profile = crud.create_or_update_profile(
        db,
        user_id=current_user.user_id,
        last_name=data.last_name,
        phone=data.phone,
        profile_image=data.profile_image,
        profile_image_mime=data.profile_image_mime
    )

    return {
        "profile_id": profile.profile_id,
        "user_id": current_user.user_id,
        "first_name": current_user.first_name,
        "email": current_user.email,
        "business_id": current_user.business_id,
        "last_name": profile.last_name,
        "phone": profile.phone,
        "profile_image": profile.profile_image,
        "profile_image_mime": profile.profile_image_mime
    }



@app.post("/report-item")
def report_item(
    item_type: str = Form(...),
    brand: str = Form(...),
    color: str = Form(...),
    description: str = Form(...),
    lost_at_location: str = Form(...),
    image: UploadFile = File(None),
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Determine status based on user role
    status = "FOUND" if current_user.role_id in [2,3] else "LOST"  # admin/staff report found items

    # Save image
    image_path = None
    image_mime = None
    if image:
        upload_dir = "uploads/items"
        os.makedirs(upload_dir, exist_ok=True)
        image_path = os.path.join(upload_dir, image.filename)
        image_mime = image.content_type
        with open(image_path, "wb") as f:
            f.write(image.file.read())

    # Create item in DB
    item = crud.create_item(
        db=db,
        user_id=current_user.user_id,
        business_id=current_user.business_id,
        item_type=item_type,
        brand=brand,
        color=color,
        description=description,
        image_path=image_path,
        lost_location=lost_at_location,
        image_mime=image_mime,
        status=status
    )

    # Run AI matching for this new item
    matches = run_ai_match_for_new_item(item, db)

    return {
        "message": "Item reported successfully",
        "item_id": item.item_id,
        "ai_matches": [
            {"lost": m.lost_item_id, "found": m.found_item_id, "score": m.similarity_score}
            for m in matches
        ]
    }

# Keep the same for staff,admin as well

# Serve uploaded images
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Get Reports Endpoint
@app.get("/my-items", response_model=List[schemas.ItemResponse])
def get_my_items(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    items = db.query(models.Item).filter(models.Item.user_id == current_user.user_id).all()
    return items



# Delete Report Endpoint
@app.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    item = db.query(models.Item).filter(
        models.Item.item_id == item_id
    ).first()

    if not item:
        raise HTTPException(status_code=404, detail="Item not found.")

    # Ownership check
    if item.user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized.")

    # 🔴 CHECK FOR MATCHES
    matches = db.query(models.Match).filter(
        (models.Match.lost_item_id == item_id) |
        (models.Match.found_item_id == item_id)
    ).all()

    for match in matches:
        if match.status.upper() in ["APPROVED", "RECLAIMED"]:
            raise HTTPException(
                status_code=400,
                detail="Item cannot be deleted after match is approved or reclaimed."
            )
    for match in matches:
        db.delete(match)
    # ✅ Safe to delete (no match OR only pending matches)
    db.delete(item)
    db.commit()

    return {"message": "Item deleted successfully"}


# get single Report Endpoint
@app.get("/item/{item_id}", response_model=schemas.ItemResponse)
def get_item_by_id(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    item = db.query(models.Item).filter(
        models.Item.item_id == item_id,
        models.Item.user_id == current_user.user_id
    ).first()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found"
        )

    return item

# Update Report Endpoint
@app.put("/item/{item_id}", response_model=schemas.ItemResponse)
def update_item(
    item_id: int,
    item: schemas.ItemUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    db_item = (
        db.query(models.Item)
        .filter(
            models.Item.item_id == item_id,
            models.Item.user_id == current_user.user_id
        )
        .first()
    )

    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")

    update_data = item.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        setattr(db_item, key, value)

    db.commit()
    db.refresh(db_item)

    return db_item


@app.post("/onboarding/start")
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



@app.post("/onboarding/complete")
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




# Run AI Matching Endpoint
@app.post("/run-ai-matching/{business_id}")
def run_ai_matching(business_id: int, db: Session = Depends(get_db)):
    # Fetch LOST items for this business
    lost_items = db.query(models.Item).filter(models.Item.business_id == business_id, models.Item.status == "LOST").all()
    
    # Fetch FOUND items for this business
    found_items = db.query(models.Item).filter(models.Item.business_id == business_id, models.Item.status == "FOUND").all()
    
    # Run AI matching
    matches = match_items(lost_items, found_items, threshold=0.65)
    
    # Save matches to DB
    saved_matches = []
    for m in matches:
        saved_match = crud.create_match(db, m["lost_item_id"], m["found_item_id"], m["similarity_score"])
        saved_matches.append(saved_match)
    
    return {"total_matches": len(saved_matches), "matches": [{"lost": m.lost_item_id, "found": m.found_item_id, "score": m.similarity_score} for m in saved_matches]}


@app.get("/matches", response_model=List[schemas.MatchResponse])
def get_ai_matches(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    matches_query = db.query(models.Match).join(
        models.Item, models.Match.found_item_id == models.Item.item_id
    )

    if current_user.role_id == 4:  # normal user
        lost_items = db.query(models.Item.item_id).filter(
            models.Item.user_id == current_user.user_id
        ).subquery()  # ignore status here
        matches_query = db.query(models.Match).filter(models.Match.lost_item_id.in_(lost_items))



    elif current_user.role_id == 3:  # staff
        # Filter matches where the staff reported the found items
        matches_query = matches_query.filter(models.Item.user_id == current_user.user_id)

    matches = matches_query.all()

    result = []
    for match in matches:
        lost_item = db.query(models.Item).filter(models.Item.item_id == match.lost_item_id).first()
        found_item = db.query(models.Item).filter(models.Item.item_id == match.found_item_id).first()

        result.append({
            "match_id": match.match_id,
            "similarity_score": match.similarity_score,
            "status": match.status,
            "lost": lost_item,
            "found": found_item,
            "created_at": match.created_at
        })

    return result


# Get Approved Matches (User + Staff)
@app.get("/approved-matches", response_model=List[schemas.MatchResponse])
def get_approved_matches(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Subquery: all item IDs belonging to current user
    user_item_ids = db.query(models.Item.item_id).filter(
        models.Item.user_id == current_user.user_id
    ).subquery()

    # Fetch approved matches involving user's items
    matches = db.query(models.Match).filter(
    or_(
        models.Match.status == "APPROVED",
        models.Match.status == "RECLAIMED"
    ),
    or_(
        models.Match.lost_item_id.in_(user_item_ids),
        models.Match.found_item_id.in_(user_item_ids)
    )
).order_by(models.Match.created_at.desc()).all()

    result = []
    for match in matches:
        lost_item = db.query(models.Item).get(match.lost_item_id)
        found_item = db.query(models.Item).get(match.found_item_id)

        result.append({
            "match_id": match.match_id,
            "similarity_score": match.similarity_score,
            "status": match.status,
            "lost": lost_item,
            "found": found_item,
            "created_at": match.created_at
        })

    return result


@app.post("/claim-item/{match_id}")
def claim_item(
    match_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    # Fetch the match
    match = db.query(models.Match).filter(models.Match.match_id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    # Fetch the lost item
    lost_item = db.query(models.Item).filter(models.Item.item_id == match.lost_item_id).first()
    if not lost_item:
        raise HTTPException(status_code=404, detail="Lost item not found")

    # Ensure current user owns the lost item
    if lost_item.user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="You are not authorized to claim this item")

    # Fetch the found item
    found_item = db.query(models.Item).filter(models.Item.item_id == match.found_item_id).first()
    if not found_item:
        raise HTTPException(status_code=404, detail="Found item not found")

    # Update match status
    match.status = "RECLAIMED"

    # Update lost and found item statuses
    lost_item.status = "RECLAIMED"
    found_item.status = "RECLAIMED"

    # Mark items as inactive
    lost_item.is_active = False
    found_item.is_active = False

    db.commit()

    return {"message": "Item successfully claimed!"}



@app.post("/admin/approve-match/{match_id}")
def approve_match(
    match_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Admin check
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

    return {
        "message": "Match approved successfully",
        "match_id": match_id,
        "status": "approved"
    }




@app.post("/admin/reject-match/{match_id}")
def reject_match(
    match_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Admin check
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

    return {
        "message": "Match rejected successfully",
        "match_id": match_id,
        "status": "rejected"
    }


# ✅ UPDATED: Complete Onboarding (Creates Subscription)
@router.post("/onboarding/complete")
def complete_onboarding(token: str, payment_id: str = None, db: Session = Depends(get_db)):
    reg = db.query(models.BusinessRegistration).filter_by(registration_token=token).first()

    if not reg:
        raise HTTPException(status_code=400, detail="Invalid registration")
    
    if reg.status == "COMPLETED":
        raise HTTPException(status_code=400, detail="Already completed")

    # 1. Create Business
    business = models.Business(
        business_name=reg.business_name,
        address=reg.address,
        contact_email=reg.contact_email,
        business_code=reg.business_code
    )
    db.add(business)
    db.flush() 

    # 2. Create Admin
    admin = models.User(
        first_name=reg.admin_name,
        email=reg.admin_email,
        password_hash=reg.admin_password_hash,
        business_id=business.business_id,
        role_id=2 # Admin
    )
    db.add(admin)

    # 3. ✅ CREATE SUBSCRIPTION ENTRY
    plan = db.query(models.SubscriptionPlan).filter_by(plan_id=reg.selected_plan_id).first()
    if plan:
        new_sub = models.BusinessSubscription(
            business_id=business.business_id,
            plan_id=plan.plan_id,
            start_date=datetime.datetime.utcnow(),
            end_date=datetime.datetime.utcnow() + datetime.timedelta(days=plan.duration_days),
            status="ACTIVE",
            payment_id=payment_id
        )
        db.add(new_sub)

    # Update Registration Status
    reg.status = "COMPLETED"
    db.commit()

    return {
        "message": "Onboarding Successful", 
        "business_code": business.business_code,
        "subscription": plan.name if plan else "Unknown"
    }