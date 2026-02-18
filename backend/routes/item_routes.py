from typing import List
from fastapi import APIRouter, BackgroundTasks, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session
import os

from fastapi import status

import models, schemas, crud
from database import get_db
from auth import get_current_user
from utils.ai_match_utils import run_ai_match_for_new_item
from utils.ai_match import generate_image_embedding,validate_image_content
from email_utils import create_notification, send_item_recovered_task, send_match_found_task


router = APIRouter(prefix="/items", tags=["Items"])
 
# Report Item Endpoint

@router.post("/report-item")
def report_item(
    background_tasks: BackgroundTasks,
    item_type: str = Form(...),
    brand: str = Form(...),
    color: str = Form(...),
    description: str = Form(...),
    lost_at_location: str = Form(...),
    image: UploadFile = File(None),
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Basic Validation
    if not item_type.strip() or not description.strip():
        raise HTTPException(status_code=400, detail="Item Type and Description are required.")

    # Determine status based on user role
    # Role 2 (Admin) & 3 (Super Admin) -> FOUND items
    # Role 1 (User) -> LOST items
    status = "FOUND" if current_user.role_id in [2, 3] else "LOST"

    image_path = None
    image_mime = None
    image_embedding = None

    if image:
        # --- A. Save Image Temporarily ---
        os.makedirs("uploads/items", exist_ok=True)
        # Use a safe filename to prevent overwrites or path traversal
        clean_filename = f"{current_user.user_id}_{image.filename}"
        image_path = f"uploads/items/{clean_filename}"
        image_mime = image.content_type
        
        # Write file to disk
        with open(image_path, "wb") as f:
            f.write(image.file.read())

        # --- B. REMOVED STRICT AI VALIDATION HERE ---
        # We are skipping validate_image_content() so you can test freely.
        
        # --- C. Generate embedding (DINOv2) ---
        # This is critical for your new matching logic
        image_embedding = generate_image_embedding(image_path)

    # 2. Create Item in DB
    item = crud.create_item(
        db=db,
        user_id=current_user.user_id,
        business_id=current_user.business_id, # Ensure user model has business_id or handle None
        item_type=item_type,
        brand=brand,
        color=color,
        description=description,
        image_path=image_path,
        lost_location=lost_at_location,
        image_mime=image_mime,
        status=status,
        image_embedding=image_embedding
    )

    # 3. Run Matching (Uses your new match_items logic)
    matches = run_ai_match_for_new_item(item, db)

    # =========================================================
    # 4. INSTANT NOTIFICATION LOGIC
    # =========================================================
    if matches:
        print(f"✨ Instant Match Found for item {item.item_id}. Triggering notifications...")
        
        # If I reported a LOST item and the system found a match (which is a FOUND item)
        if item.status == "LOST":
            best_match = matches[0] # Take the top match
            
            # Helper to safely get match_id depending on return type
            # matches is likely a list of Match objects from your CRUD
            match_id = getattr(best_match, 'match_id', None) 
            # If your CRUD returns dicts instead of objects, fallback to .get()
            if not match_id and isinstance(best_match, dict):
                match_id = best_match.get('match_id')

            # 1. Create Dashboard Notification
            create_notification(
                db=db,
                user_id=current_user.user_id,
                item_id=item.item_id,
                match_id=match_id,
                title="Instant Match Found",
                message=f"Good news! We found a potential match for your {item.item_type} immediately.",
                notification_type="MATCH_FOUND"
            )

            # 2. Send Email in Background
            if current_user.email:
                background_tasks.add_task(
                    send_match_found_task,
                    user_email=current_user.email,
                    item_type=item.item_type
                )
    
    # Return Result
    return {
        "message": "Item reported successfully",
        "item_id": item.item_id,
        "ai_matches": matches 
        # Note: 'matches' here will be the list of MATCH OBJECTS created in DB.
        # If run_ai_match_for_new_item returns simple dicts, that's what shows up.
    }

# Get My Items Endpoint
@router.get("/my-items", response_model=List[schemas.ItemResponse])
def get_my_items(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. If Admin (2)  Fetch ALL items for their business
    if current_user.role_id in [2]:
        if current_user.business_id:
            items = db.query(models.Item).filter(
                models.Item.business_id == current_user.business_id
            ).order_by(models.Item.created_at.desc()).all()
        else:
            # Fallback: If admin has no business_id, show empty or handle error
            items = []
            
    # 2. If Normal User & staff (4,3): Fetch ONLY their own items
    else:
        items = db.query(models.Item).filter(
            models.Item.user_id == current_user.user_id
        ).order_by(models.Item.created_at.desc()).all()

    return items


# Delete Report Endpoint
@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    item = db.query(models.Item).filter(
        models.Item.item_id == item_id,
        models.Item.user_id == current_user.user_id
    ).first()

    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    # 🔴 BLOCK DELETE IF MATCH EXISTS
    match_exists = db.query(models.Match).filter(
        (models.Match.lost_item_id == item_id) |
        (models.Match.found_item_id == item_id)
    ).first()

    if match_exists:
        raise HTTPException(
            status_code=403,
            detail="Item cannot be deleted after a match is found."
        )

    db.delete(item)
    db.commit()

    return {"message": "Item deleted successfully"}



# get single Report Endpoint
@router.get("/item/{item_id}", response_model=schemas.ItemResponse)
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
@router.put("/item/{item_id}", response_model=schemas.ItemResponse)
def update_item(
    item_id: int,
    item: schemas.ItemUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    db_item = db.query(models.Item).filter(
        models.Item.item_id == item_id,
        models.Item.user_id == current_user.user_id
    ).first()

    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")

    # 🔴 BLOCK UPDATE IF MATCH EXISTS
    match_exists = db.query(models.Match).filter(
        (models.Match.lost_item_id == item_id) |
        (models.Match.found_item_id == item_id)
    ).first()

    if match_exists:
        raise HTTPException(
            status_code=403,
            detail="Item cannot be updated after a match is found."
        )

    update_data = item.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        setattr(db_item, key, value)

    db.commit()
    db.refresh(db_item)

    return db_item


@router.post("/claim-item/{match_id}")
def claim_item(
    match_id: int,
    background_tasks: BackgroundTasks, # <--- 1. Inject BackgroundTasks
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # --- Fetching & Validation Logic (Kept mostly the same) ---
    match = db.query(models.Match).filter(
        models.Match.match_id == match_id
    ).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    lost_item = db.query(models.Item).filter(
        models.Item.item_id == match.lost_item_id
    ).first()
    if not lost_item:
        raise HTTPException(status_code=404, detail="Lost item not found")

    # Authorization Check
    if lost_item.user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="You are not authorized to claim this item")

    found_item = db.query(models.Item).filter(
        models.Item.item_id == match.found_item_id
    ).first()
    if not found_item:
        raise HTTPException(status_code=404, detail="Found item not found")

    # --- Update Statuses ---
    match.status = "RECLAIMED"
    lost_item.status = "RECLAIMED"
    found_item.status = "RECLAIMED"

    lost_item.is_active = False
    found_item.is_active = False

    db.commit()
    db.refresh(match)

    # ✅ REFACTORED NOTIFICATION LOGIC
    
    # 1. Create DB Record (Sync)
    # We do this immediately so the user sees the notification in their dashboard instantly
    create_notification(
        db=db,
        user_id=current_user.user_id,
        item_id=lost_item.item_id,
        match_id=match.match_id,
        title="Item Recovered",
        message=f"Success! Your {lost_item.item_type} has been successfully recovered.",
        notification_type="ITEM_RECOVERED"
    )

    # 2. Send Email (Async Background Task)
    # This prevents the page from loading slowly while waiting for Gmail/SMTP
    background_tasks.add_task(
        send_item_recovered_task,
        user_email=current_user.email,
        item_type=lost_item.item_type
    )

    return {"message": "Item successfully claimed!"}