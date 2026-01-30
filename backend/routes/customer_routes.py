from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from pydantic import BaseModel
import models, auth
from database import get_db

router = APIRouter(prefix="/customers", tags=["Customer Management"])

# --- Schema ---
class CustomerResponse(BaseModel):
    user_id: int
    first_name: str
    email: str
    items_reported: int
    last_active: Optional[str] = None
    status: str

@router.get("/customer", response_model=List[CustomerResponse])
def get_customers(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    # Only Admin (2) or Staff (3) can view customers
    if current_user.role_id not in [2, 3]:
        raise HTTPException(status_code=403, detail="Not authorized")

    # 1. Fetch Users with Role 4 (Normal User)
    # OPTION A: If users are linked to business_id (e.g. Hotel Guests)
    query = db.query(models.User).filter(
        models.User.role_id == 4,
        models.User.business_id == current_user.business_id 
    )
    
    # OPTION B: If users are global (Not linked to business), remove the business_id filter above.
    # For now, we assume they are linked to your business context.

    users = query.all()
    
    results = []
    for user in users:
        # 2. Count Items Reported by this user
        item_count = db.query(models.Item).filter(models.Item.user_id == user.user_id).count()
        
        results.append({
            "user_id": user.user_id,
            "first_name": user.first_name,
            "email": user.email,
            "items_reported": item_count,
            "last_active": user.created_at.strftime("%Y-%m-%d") if user.created_at else None,
            "status": "Active" if user.is_active else "Inactive"
        })

    return results

@router.delete("/{user_id}")
def delete_customer(
    user_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role_id != 2: # Only Admin can delete
        raise HTTPException(status_code=403, detail="Not authorized")

    user = db.query(models.User).filter(
        models.User.user_id == user_id, 
        models.User.role_id == 4,
        models.User.business_id == current_user.business_id
    ).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    db.delete(user)
    db.commit()
    return {"message": "User removed"}



@router.patch("/{user_id}/toggle-status")
def toggle_user_status(
    user_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    # Only Admin can change status
    if current_user.role_id != 2:
        raise HTTPException(status_code=403, detail="Not authorized")

    user = db.query(models.User).filter(
        models.User.user_id == user_id,
        models.User.business_id == current_user.business_id
    ).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Toggle the boolean
    user.is_active = not user.is_active
    db.commit()
    
    status_msg = "activated" if user.is_active else "deactivated"
    return {"message": f"User {status_msg} successfully", "new_status": user.is_active}