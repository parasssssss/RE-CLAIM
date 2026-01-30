from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, EmailStr
import models,auth,crud
from datetime import datetime
from database import get_db
from auth import get_current_user
from crud import get_password_hash

router = APIRouter(prefix="/staff", tags=["Staff Management"])

# --- Pydantic Schemas for Inputs ---
class StaffCreate(BaseModel):
    first_name: str
    last_name: Optional[str] = None
    email: EmailStr
    password: str

class StaffResponse(BaseModel):
    user_id: int
    first_name: str
    last_name: Optional[str] = None
    email: str
    is_active: bool
    last_login: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# --- Endpoints ---

@router.get("/my-staff", response_model=List[StaffResponse])
def get_my_staff(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Fetch all staff members (Role 3) belonging to the Admin's business.
    """
    # 1. Security Check: Only Admins (Role 2) can view staff list
    if current_user.role_id != 2:
        raise HTTPException(status_code=403, detail="Not authorized to view staff")

    if not current_user.business_id:
        raise HTTPException(status_code=400, detail="You are not linked to a business")

    # 2. Query: Find users with role_id=3 AND same business_id
    staff_members = db.query(models.User).filter(
        models.User.business_id == current_user.business_id,
        models.User.role_id == 3  # Strictly fetch staff, not other admins
    ).all()

    return staff_members


@router.post("/create", response_model=StaffResponse)
def create_staff_member(
    staff_data: StaffCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new Staff account (Role 3) linked to the Admin's business.
    """
    # 1. Security Check
    if current_user.role_id != 2:
        raise HTTPException(status_code=403, detail="Only Admins can create staff")

    # 2. Check if email exists
    existing_user = db.query(models.User).filter(models.User.email == staff_data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    # 3. Hash Password
    hashed_pw = crud.get_password_hash(staff_data.password)

    # 4. Create User Object
    new_staff = models.User(
        first_name=staff_data.first_name,
        email=staff_data.email,
        password_hash=hashed_pw,
        role_id=3,  # Force Role ID 3 (Staff)
        business_id=current_user.business_id, # Link to Admin's Business
        is_active=True
    )
    
    # Optional: Handle last name manually since it might not be in the model constructor depending on setup
    if hasattr(models.User, 'last_name'):
        new_staff.last_name = staff_data.last_name

    db.add(new_staff)
    db.commit()
    db.refresh(new_staff)
    
    # 5. Create Empty Profile (Optional, prevents errors later)
    new_profile = models.UserProfile(user_id=new_staff.user_id)
    db.add(new_profile)
    db.commit()

    return new_staff


@router.patch("/{user_id}/status")
def update_staff_status(
    user_id: int,
    active: bool,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Suspend or Activate a staff member.
    """
    if current_user.role_id != 2:
        raise HTTPException(status_code=403, detail="Not authorized")

    # 1. Find the staff member
    staff_member = db.query(models.User).filter(
        models.User.user_id == user_id,
        models.User.business_id == current_user.business_id
    ).first()

    if not staff_member:
        raise HTTPException(status_code=404, detail="Staff member not found")

    # 2. Update Status
    staff_member.is_active = active
    db.commit()

    return {"message": "Status updated", "is_active": staff_member.is_active}