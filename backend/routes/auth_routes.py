
from fastapi import APIRouter, Depends, HTTPException, Body,status
from sqlalchemy.orm import Session
from datetime import timedelta
from datetime import datetime
import crud, models, schemas
from database import get_db
from auth import create_access_token, decode_access_token
from email_utils import send_reset_email

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=schemas.UserOut)
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
        raise HTTPException(status_code=400, detail="Email already registered")

    return crud.create_user(db, user, business.business_id)


@router.post("/login")
def login_user(user: schemas.UserLogin, db: Session = Depends(get_db)):
    # 1. Find User
    db_user = db.query(models.User).filter(
        models.User.email == user.email
    ).first()

    # 2. Verify Credentials
    if not db_user or not crud.verify_password(user.password, db_user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # 3. 🛑 CHECK SUSPENSION (New Logic)
    # Ensure your User model has 'is_active'. If not, see the note below.
    if not db_user.is_active: 
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account suspended. Please contact your administrator."
        )

    # 4. ✅ Update Last Login
    db_user.last_login = datetime.utcnow()
    db.commit()

    # 5. Generate Token
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


@router.post("/forgot-password")
def forgot_password(data: dict, db: Session = Depends(get_db)):
    user = crud.get_user_by_email(db, data.get("email"))
    if not user:
        raise HTTPException(status_code=404, detail="Email not registered")

    token = create_access_token(
        {"sub": str(user.user_id)},
        expires_delta=timedelta(minutes=15)
    )

    reset_link = f"http://127.0.0.1:56311/frontend/reset_password.html?token={token}"
    send_reset_email(user.email, reset_link)

    return {"message": "Reset link sent to your email."}


@router.post("/reset-password")
def reset_password(data: dict = Body(...), db: Session = Depends(get_db)):
    payload = decode_access_token(data["token"])
    user = crud.get_user_by_id(db, int(payload["sub"]))

    user.password_hash = crud.get_password_hash(data["new_password"])
    db.commit()

    return {"message": "Password reset successful"}
