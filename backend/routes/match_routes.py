from typing import List
from sqlalchemy import or_
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session

import crud
from utils.ai_match import match_items
import models, schemas
from database import get_db
from auth import get_current_user
from email_utils import create_notification, send_match_found_task
from fastapi import File, UploadFile, HTTPException
from PIL import Image as PILImage
import io
import utils.ai_match as ai_match # Import the file we just updated

router = APIRouter(prefix="/matches", tags=["Matches"])



# Run AI Matching Endpoint
@router.post("/run-ai-matching/{business_id}")
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


@router.get("/matches", response_model=List[schemas.MatchResponse])
def get_ai_matches(
    background_tasks: BackgroundTasks,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Start the query by joining Match -> Found Item
    matches_query = db.query(models.Match).join(
        models.Item, models.Match.found_item_id == models.Item.item_id
    )

    # CASE A: Business Admin (Role 2) or Staff (Role 3)
    if current_user.role_id in [2, 3]: 
        if not current_user.business_id:
            return []
        matches_query = matches_query.filter(
            models.Item.business_id == current_user.business_id
        )

    # CASE B: Normal User (Role 4)
    elif current_user.role_id == 4:
        user_lost_items = db.query(models.Item.item_id).filter(
            models.Item.user_id == current_user.user_id
        ).subquery()
        matches_query = matches_query.filter(
            models.Match.lost_item_id.in_(user_lost_items)
        )

    matches = matches_query.all()
    result = []

    for match in matches:
        lost_item = db.query(models.Item).filter(models.Item.item_id == match.lost_item_id).first()
        found_item = db.query(models.Item).filter(models.Item.item_id == match.found_item_id).first()

        # ✅ FIXED NOTIFICATION LOGIC
        
        # 1. Check for duplicates
        existing_notif = db.query(models.Notification).filter_by(
            user_id=current_user.user_id,
            match_id=match.match_id,
            notification_type="MATCH_FOUND"
        ).first()

        if not existing_notif:
            # 2. Use helper to Create Notification (Sync)
            # This automatically handles the commit and required fields
            create_notification(
                db=db,
                user_id=current_user.user_id,
                item_id=lost_item.item_id, # <--- Added item_id (Good practice)
                match_id=match.match_id,
                title="Match Found",       # <--- FIXED: Added Title
                message=f"A match was found for your {lost_item.item_type}!",
                notification_type="MATCH_FOUND"
            )
            
            # 3. Schedule Email (Async)
            background_tasks.add_task(
                send_match_found_task,
                user_email=current_user.email,
                item_type=lost_item.item_type
            )

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
@router.get("/approved-matches", response_model=List[schemas.MatchResponse])
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


@router.get("/match/{match_id}", response_model=schemas.MatchResponse)
def get_single_match(
    match_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    match = db.query(models.Match).filter(models.Match.match_id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    # Security check: only allow user to access their own lost/found items
    lost_item = db.query(models.Item).filter(models.Item.item_id == match.lost_item_id).first()
    found_item = db.query(models.Item).filter(models.Item.item_id == match.found_item_id).first()
    
    if current_user.role_id == 4 and lost_item.user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    if current_user.role_id == 3 and found_item.user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    return {
        "match_id": match.match_id,
        "similarity_score": match.similarity_score,
        "status": match.status,
        "lost": lost_item,
        "found": found_item,
        "created_at": match.created_at
    }



@router.post("/search-by-image")
async def search_lost_item_by_image(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    # 1. Validate File Type
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image (JPG, PNG)")

    try:
        # 2. Read and Process Image
        contents = await file.read()
        try:
            user_image = PILImage.open(io.BytesIO(contents))
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid image file")
        
        # 3. Generate Embedding for the uploaded image
        # This calls the helper in ai_match.py
        query_embedding = ai_match.encode_image(user_image)
        
        if query_embedding is None:
            raise HTTPException(status_code=500, detail="AI Model failed to process image")

        # 4. Fetch Candidates (Only 'FOUND' items)
        # We fetch all FOUND items. The utility function will handle checking 
        # if the file actually exists on disk, so we don't need complex filtering here.
        found_items = db.query(models.Item).filter(
            models.Item.status == 'FOUND'
        ).all()
        
        if not found_items:
            return {
                "message": "No found items in database to compare against.", 
                "matches": []
            }

        # 5. Run Comparison (The Robust Logic)
        # This returns a LIST of matches (e.g., top 5)
        matches = ai_match.find_visual_matches(query_embedding, found_items, top_k=5)
        
        # 6. Final Response
        if not matches:
            return {
                "message": "No visual matches found.", 
                "matches": [] 
            }

        return {
            "message": f"Search complete. Found {len(matches)} potential matches.",
            "matches": matches
        }

    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Visual Search Critical Error: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error during visual search")