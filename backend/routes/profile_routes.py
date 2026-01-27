from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

import crud, schemas
from database import get_db
from auth import get_current_user

router = APIRouter(prefix="/users", tags=["Users"])



@router.get("/me", response_model=schemas.UserOut)
def read_current_user(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    profile = crud.get_profile_by_user_id(db, current_user.user_id)

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


@router.put("/profile", response_model=schemas.ProfileOut)
def update_profile(
    data: schemas.ProfileBase,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    current_user.first_name = data.first_name
    current_user.email = data.email
    db.commit()

    profile = crud.create_or_update_profile(
        db,
        current_user.user_id,
        data.last_name,
        data.phone,
        data.profile_image,
        data.profile_image_mime
    )

    return profile
