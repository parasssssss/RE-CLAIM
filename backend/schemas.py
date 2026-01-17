from pydantic import BaseModel, EmailStr
from datetime import date, datetime
from typing import Optional

class UserCreate(BaseModel):
    first_name: str
    email: EmailStr
    password: str
    business_id: int | None = None  # optional for normal users
    business_code: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str
    
    

class UserOut(BaseModel):
    user_id: int
    first_name: str
    email: EmailStr
    business_id: int | None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    profile_image: Optional[str] = None
    profile_image_mime: Optional[str] = None
    role_id: Optional[int]


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
    image_path: Optional[str]
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
    is_active: bool = True

class ItemUpdate(BaseModel):
    item_type: Optional[str] = None
    brand: Optional[str] = None
    color: Optional[str] = None
    description: Optional[str] = None
    lost_location: Optional[str] = None


class ItemInfo(BaseModel):
    item_id: int
    item_type: str
    brand: Optional[str]
    color: Optional[str]
    description: Optional[str]
    image_path: Optional[str]
    lost_location: Optional[str]
    created_at: datetime

class MatchResponse(BaseModel):
    match_id: int
    similarity_score: float
    status: str
    lost: ItemInfo
    found: ItemInfo
    created_at: datetime



class Config:
    from_attributes = True
    
