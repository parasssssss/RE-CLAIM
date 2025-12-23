import shutil
from typing import List
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File,Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from database import Base, engine, get_db
from auth import create_access_token,get_current_user
from datetime import timedelta
from email_utils import send_reset_email 
from fastapi import Body
from auth import decode_access_token
import crud,models,schemas
import os


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





#fetch User Details Endpoint

@app.get("/me", response_model=schemas.UserOut)
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
    }



# Registration Endpoint
@app.post("/register", response_model=schemas.UserOut)
def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = crud.get_user_by_email(db, user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    return crud.create_user(db, user)

# Login Endpoint
@app.post("/login")
def login_user(user: schemas.UserLogin, db: Session = Depends(get_db)):
    db_user = crud.get_user_by_email(db, user.email)
    if not db_user or not crud.verify_password(user.password, db_user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({"sub": str(db_user.user_id)})
    return {"access_token": token, "token_type": "bearer", "user_id": db_user.user_id}


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



# Report Item Endpoint


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

    return {"message": "Item reported successfully", "item_id": item.item_id}



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


#delete Report Endpoint
@app.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    item = db.query(models.Item).filter(models.Item.item_id == item_id).first()

    if not item:
        raise HTTPException(status_code=404, detail="Item not found.")


    if item.user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this item.")

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






