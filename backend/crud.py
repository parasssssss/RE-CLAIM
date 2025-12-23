from datetime import datetime
from sqlalchemy.orm import Session
import models
from models import Item, User, UserProfile
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_user_by_email(db: Session, email: str):
    return db.query(User).filter(User.email == email).first()

def get_user_by_id(db: Session, user_id: int):
    return db.query(User).filter(User.user_id == user_id).first()


def get_password_hash(password: str):
    return pwd_context.hash(password)

def create_user(db: Session, user_data):
    hashed_password = pwd_context.hash(user_data.password)
    db_user = User(
        first_name=user_data.first_name,
        email=user_data.email,
        password_hash=hashed_password,
        business_id=user_data.business_id,
        role_id=4  # normal user by default
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

# Get profile by user_id
def get_profile_by_user_id(db: Session, user_id: int):
    return db.query(UserProfile).filter(UserProfile.user_id == user_id).first()

def create_or_update_profile(db: Session, user_id: int, last_name: str = None, phone: str = None, profile_image: str = None, profile_image_mime: str = None):
    profile = db.query(models.UserProfile).filter(models.UserProfile.user_id == user_id).first()
    if not profile:
        profile = models.UserProfile(user_id=user_id)
        db.add(profile)
    
    if last_name is not None:
        profile.last_name = last_name
    if phone is not None:
        profile.phone = phone
    if profile_image is not None:
        profile.profile_image = profile_image
        profile.profile_image_mime = profile_image_mime

    db.commit()
    db.refresh(profile)
    return profile



def create_item(
    db: Session,
    user_id: int,
    business_id: int,
    item_type: str,
    brand: str,
    color: str,
    description: str,
    image_path: str,
    lost_location: str = None,
    image_mime: str = None,
    status: str = "LOST"
):
    db_item = models.Item(
        user_id=user_id,
        business_id=business_id,
        item_type=item_type,
        brand=brand,
        color=color,
        description=description,
        image_path=image_path,
        image_mime=image_mime,
        status=status,
        lost_location=lost_location
    )
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item