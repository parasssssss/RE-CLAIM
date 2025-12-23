from pydantic import BaseModel, EmailStr
from datetime import date, datetime
from typing import Optional

class UserCreate(BaseModel):
    first_name: str
    email: EmailStr
    password: str
    business_id: int | None = None  # optional for normal users

class UserLogin(BaseModel):
    email: EmailStr
    password: str
    business_id: int | None = None

class UserOut(BaseModel):
    user_id: int
    first_name: str
    email: EmailStr
    business_id: int | None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    profile_image: Optional[str] = None
    profile_image_mime: Optional[str] = None


class ProfileBase(BaseModel):
    first_name: Optional[str] = None
    email: Optional[EmailStr] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    profile_image: Optional[str] = None       # encrypted base64
    profile_image_mime: Optional[str] = None


class ProfileOut(ProfileBase):
    profile_id: int
    user_id: int

class EmptyProfile:
        last_name = None
        phone = None
        profile_image = None
        profile_image_mime = None
   


class ItemBase(BaseModel):
    item_type: str
    brand: Optional[str]
    color: Optional[str]
    description: Optional[str]
    image_path: str
    image_mime: Optional[str]
    status: Optional[str] = "LOST"
    ai_match_score: Optional[float]

class ItemCreate(ItemBase):
    pass

class ItemOut(ItemBase):
    item_id: int
    user_id: int
    business_id: int
    ai_match_score: Optional[float] = None
    created_at: datetime
    updated_at: datetime



class ItemResponse(ItemBase):
    item_id: int
    user_id: Optional[int]
    business_id: Optional[int]
    created_at: datetime
    updated_at: Optional[datetime]
    lost_location: Optional[str] = None

class ItemUpdate(BaseModel):
    item_type: Optional[str] = None
    brand: Optional[str] = None
    color: Optional[str] = None
    description: Optional[str] = None
    lost_location: Optional[str] = None



class Config:
    from_attributes = True
    
