from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel
from sqlalchemy import or_
from fastapi.responses import StreamingResponse
from io import BytesIO
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, mm
import os

import models, auth
from database import get_db

router = APIRouter(prefix="/billing", tags=["Billing"])

# --- Schemas ---
class PlanResponse(BaseModel):
    plan_id: int
    name: str
    price: float
    features: Optional[str]
    duration_days: int

class SubscriptionResponse(BaseModel):
    plan_name: str
    status: str
    end_date: Optional[datetime]
    price: float

class PaymentHistoryResponse(BaseModel):
    payment_id: int
    date: datetime
    amount: float
    status: str
    description: str

# --- Endpoints ---

@router.get("/current", response_model=SubscriptionResponse)
def get_current_subscription(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Fetch the active subscription for the user's business.
    """
    if not current_user.business_id:
        raise HTTPException(status_code=400, detail="User not linked to a business")

    # Fetch active subscription
    sub = db.query(models.BusinessSubscription).filter(
        models.BusinessSubscription.business_id == current_user.business_id,
        models.BusinessSubscription.status == "ACTIVE"
    ).first()

    if not sub:
        # Default to Free if no active sub found
        return {
            "plan_name": "Free Tier",
            "status": "ACTIVE",
            "end_date": None,
            "price": 0.0
        }

    # Fetch plan details
    plan = db.query(models.SubscriptionPlan).filter(models.SubscriptionPlan.plan_id == sub.plan_id).first()
    
    return {
        "plan_name": plan.name if plan else "Unknown Plan",
        "status": sub.status,
        "end_date": sub.end_date,
        "price": plan.price if plan else 0.0
    }

@router.get("/plans", response_model=List[PlanResponse])
def get_available_plans(db: Session = Depends(get_db)):
    """
    List all available subscription plans for the pricing table.
    """
    plans = db.query(models.SubscriptionPlan).filter(models.SubscriptionPlan.is_active == True).all()
    return plans



# ✅ NEW: Schema for Upgrade Request
class UpgradeRequest(BaseModel):
    plan_id: int
    payment_id: str

# ✅ NEW: Endpoint to handle Upgrade Success
@router.post("/upgrade")
def upgrade_plan(
    data: UpgradeRequest,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Called by Frontend after a successful Razorpay payment.
    Updates the business subscription in the database.
    """
    if not current_user.business_id:
        raise HTTPException(status_code=400, detail="User is not linked to a business")

    # 1. Fetch the selected plan to get duration
    new_plan = db.query(models.SubscriptionPlan).filter(models.SubscriptionPlan.plan_id == data.plan_id).first()
    if not new_plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    # 2. Check for existing subscription
    existing_sub = db.query(models.BusinessSubscription).filter(
        models.BusinessSubscription.business_id == current_user.business_id,
        models.BusinessSubscription.status == "ACTIVE"
    ).first()

    # 3. Calculate Dates
    start_date = datetime.utcnow()
    end_date = start_date + timedelta(days=new_plan.duration_days)

    # 4. Update or Create Logic
    if existing_sub:
        # Option A: Update existing record
        existing_sub.plan_id = new_plan.plan_id
        existing_sub.payment_id = data.payment_id
        existing_sub.start_date = start_date
        existing_sub.end_date = end_date
        # existing_sub.status remains ACTIVE
    else:
        # Option B: Create new record
        new_sub = models.BusinessSubscription(
            business_id=current_user.business_id,
            plan_id=new_plan.plan_id,
            start_date=start_date,
            end_date=end_date,
            status="ACTIVE",
            payment_id=data.payment_id
        )
        db.add(new_sub)

    # 5. Log the Payment (Optional but recommended for history)
    # Since you have a Payment table, let's add a record there too
    payment_record = models.Payment(
        # ✅ FIX 1: Save the actual Business ID to the correct column
        business_id=current_user.business_id, 
        
        # ✅ FIX 2: You can leave registration_token NULL for upgrades, 
        # or store the string ID if you really want, but business_id is mandatory.
        registration_token=None, 
        
        razorpay_payment_id=data.payment_id,
        amount=new_plan.price,
        status="PAID",
        razorpay_order_id="DIRECT_JS",
        created_at=datetime.utcnow()
    )
    db.add(payment_record)

    db.commit()

    return {"status": "success", "plan": new_plan.name}



# billing_routes.py

@router.get("/history", response_model=List[PaymentHistoryResponse])
def get_payment_history(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user.business_id:
        return []
    
    # Simple, standard fetch. 
    # Since Onboarding AND Upgrades now both write to this table, it works perfectly.
    payments = db.query(models.Payment).filter(
        models.Payment.business_id == current_user.business_id
    ).order_by(models.Payment.created_at.desc()).all()

    history_list = []
    for p in payments:
        history_list.append({
            "payment_id": p.payment_id,
            "date": p.created_at,
            "amount": float(p.amount) if p.amount else 0.0,
            "status": p.status,
            "description": f"Payment #{p.payment_id}" # Simple description
        })

    return history_list



# billing_routes.py imports (Ensure these are present)
from fastapi.responses import StreamingResponse
from io import BytesIO
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, mm
import os

# --- MODERN INVOICE GENERATOR ---
def generate_modern_invoice(payment, business, plan_name):
    buffer = BytesIO()
    # Modern margins: slightly wider for a "card" feel
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=30)
    story = []
    styles = getSampleStyleSheet()

    # --- THEME COLORS ---
    theme_dark = colors.Color(0.15, 0.18, 0.22)   # #272e38 (Dark Charcoal)
    theme_accent = colors.Color(0.25, 0.35, 0.95) # #4059F2 (Modern Indigo)
    text_gray = colors.Color(0.4, 0.4, 0.4)       # Muted Gray

    # --- CUSTOM STYLES ---
    styles.add(ParagraphStyle(name='BrandTitle', fontSize=24, fontName='Helvetica-Bold', textColor=theme_dark, spaceAfter=2))
    styles.add(ParagraphStyle(name='InvoiceBadge', fontSize=14, fontName='Helvetica-Bold', textColor=theme_accent, alignment=2)) # Right align
    styles.add(ParagraphStyle(name='SectionHeader', fontSize=9, fontName='Helvetica-Bold', textColor=text_gray, spaceAfter=4, textTransform='uppercase'))
    styles.add(ParagraphStyle(name='NormalText', fontSize=10, fontName='Helvetica', textColor=colors.black, leading=14))
    styles.add(ParagraphStyle(name='MutedText', fontSize=9, fontName='Helvetica', textColor=text_gray, leading=12))

    # --- 1. HEADER SECTION (Logo + Invoice Label) ---
    # Try to load 'logo.png', otherwise use text
    logo_path = "./frontend/images/logo.png" 
    if os.path.exists(logo_path):
        # Resize logo to fit nicely (width=1.5 inch, preserve aspect ratio)
        logo_img = Image(logo_path, width=1.5*inch, height=0.5*inch) 
        logo_img.hAlign = 'LEFT'
        brand_cell = logo_img
    else:
        brand_cell = Paragraph("RECLAIM", styles['BrandTitle'])

    header_data = [
        [brand_cell, Paragraph("INVOICE", styles['InvoiceBadge'])]
    ]
    
    header_table = Table(header_data, colWidths=[4.5*inch, 2.5*inch])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('ALIGN', (1,0), (1,0), 'RIGHT'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 20),
        ('LINEBELOW', (0,0), (-1,-1), 1, colors.Color(0.9, 0.9, 0.9)), # Subtle separator
    ]))
    story.append(header_table)
    story.append(Spacer(1, 20))

    # --- 2. BILLING GRID (Modern 2-Column Layout) ---
    date_str = payment.created_at.strftime("%b %d, %Y")
    
    # Left: Client Info | Right: Metadata
    bill_to_content = [
        Paragraph("BILL TO", styles['SectionHeader']),
        Paragraph(f"<b>{business.business_name}</b>", styles['NormalText']),
        Paragraph(business.address or "Address Not Provided", styles['MutedText']),
        Paragraph(business.contact_email, styles['MutedText']),
    ]

    meta_content = [
        [Paragraph("INVOICE #", styles['SectionHeader']), Paragraph(f"<b>{payment.payment_id:05d}</b>", styles['NormalText'])],
        [Paragraph("DATE", styles['SectionHeader']), Paragraph(date_str, styles['NormalText'])],
        [Paragraph("STATUS", styles['SectionHeader']), Paragraph("PAID", styles['NormalText'])],
    ]
    
    # We create a table inside a table for the right side to align perfectly
    meta_table_inner = Table(meta_content, colWidths=[1*inch, 1.5*inch])
    meta_table_inner.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
    ]))

    info_table = Table([[bill_to_content, meta_table_inner]], colWidths=[4.5*inch, 2.5*inch])
    info_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 30))

    # --- 3. ITEMS TABLE (Clean & Minimalist) ---
    data = [
        ['ITEM DESCRIPTION', 'QTY', 'PRICE', 'TOTAL'] # Header
    ]
    # Item Row
    data.append([
        Paragraph(f"<b>{plan_name}</b><br/><font size=8 color=#666666>Valid for 30 Days</font>", styles['NormalText']),
        "1",
        f"INR {payment.amount:,.2f}",
        f"INR {payment.amount:,.2f}"
    ])

    t = Table(data, colWidths=[4*inch, 0.7*inch, 1.1*inch, 1.2*inch])
    t.setStyle(TableStyle([
        # Header Styling
        ('BACKGROUND', (0,0), (-1,0), theme_dark),      # Dark Header Background
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),     # White Text
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,0), 9),
        ('BOTTOMPADDING', (0,0), (-1,0), 10),
        ('TOPPADDING', (0,0), (-1,0), 10),
        
        # Row Styling
        ('ALIGN', (1,1), (-1,-1), 'RIGHT'),             # Align numbers right
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('FONTNAME', (0,1), (-1,-1), 'Helvetica'),
        ('BOTTOMPADDING', (0,1), (-1,-1), 15),
        ('TOPPADDING', (0,1), (-1,-1), 15),
        ('LINEBELOW', (0,1), (-1,-1), 0.5, colors.Color(0.9, 0.9, 0.9)), # Very light separators
    ]))
    story.append(t)
    
    # --- 4. TOTALS SECTION ---
    story.append(Spacer(1, 10))
    total_data = [
        ["Subtotal", f"INR {payment.amount:,.2f}"],
        ["Tax (0%)", "INR 0.00"],
        ["TOTAL", f"INR {payment.amount:,.2f}"]
    ]
    
    total_table = Table(total_data, colWidths=[5.8*inch, 1.2*inch])
    total_table.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'RIGHT'),
        ('FONTNAME', (0,0), (0,-2), 'Helvetica'),       # Normal font for subtotal
        ('FONTNAME', (0,-1), (-1,-1), 'Helvetica-Bold'),# Bold for Grand Total
        ('TEXTCOLOR', (0,-1), (-1,-1), theme_accent),   # Accent Color for Total
        ('FONTSIZE', (0,-1), (-1,-1), 12),
        ('TOPPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(total_table)

    # --- 5. FOOTER ---
    story.append(Spacer(1, 50))
    
    # Draw a colored footer bar
    footer_text = Paragraph(
        "Thank you for your business. If you have any questions, please contact support@Reclaim.com", 
        styles['MutedText']
    )
    story.append(footer_text)

    doc.build(story)
    buffer.seek(0)
    return buffer

# --- API ENDPOINT (Update the function call) ---
@router.get("/invoice/{payment_id}")
def download_invoice(
    payment_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    # ... (Keep your fetching logic same as before) ...
    payment = db.query(models.Payment).filter(models.Payment.payment_id == payment_id).first()
    if not payment: raise HTTPException(status_code=404, detail="Not found")
    if payment.business_id != current_user.business_id: raise HTTPException(status_code=403, detail="Denied")
    
    business = db.query(models.Business).filter(models.Business.business_id == payment.business_id).first()
    plan_name = "Premium Plan" 

    # CALL THE NEW FUNCTION HERE
    pdf_buffer = generate_modern_invoice(payment, business, plan_name)

    filename = f"Invoice_{payment.razorpay_payment_id}.pdf"
    return StreamingResponse(
        pdf_buffer, 
        media_type="application/pdf", 
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )