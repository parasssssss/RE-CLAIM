import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from dotenv import load_dotenv
load_dotenv()

def send_reset_email(to_email, reset_link):
    sender_email = "info.reclaimm@gmail.com"
    sender_password = os.getenv("APP_PASSWORD")  
    
    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Password Reset - Reclaim"
    msg["From"] = sender_email
    msg["To"] = to_email
    
    html = f"""
    <html>
      <body>
        <p>Hi,<br>
           Click the link below to reset your password:<br>
           <a href="{reset_link}">Reset Password</a>
        </p>
      </body>
    </html>
    """
    
    msg.attach(MIMEText(html, "html"))
    
    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
        server.login(sender_email, sender_password)
        server.sendmail(sender_email, to_email, msg.as_string())




def send_email(to_email: str, subject: str, html_body: str):
    try:
        sender_email = "info.reclaimm@gmail.com"
        sender_password = os.getenv("APP_PASSWORD")

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = sender_email
        msg["To"] = to_email
        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(sender_email, sender_password)
            server.sendmail(sender_email, to_email, msg.as_string())

        print("✅ Email sent to", to_email)

    except Exception as e:
        print("❌ Email failed:", e)


# 🔔 Match Found
def send_match_found_email(to_email, item_type):
    html = f"""
    <html>
      <body>
        <h3>🔍 Possible Match Found!</h3>
        <p>
          Good news! We found a possible match for your item:
          <b>{item_type}</b>
        </p>
        <p>
          Please log in to your dashboard to review the details.
        </p>
      </body>
    </html>
    """
    send_email(to_email, "Possible Match Found - ReClaim", html)


# ✅ Match Approved
def send_match_approved_email(to_email, item_type):
    html = f"""
    <html>
      <body>
        <h3>✅ Match Approved</h3>
        <p>
          Your reported item <b>{item_type}</b> has been approved for recovery.
        </p>
        <p>
          Please check your dashboard for next steps.
        </p>
      </body>
    </html>
    """
    send_email(to_email, "Match Approved - ReClaim", html)


# ❌ Match Rejected
def send_match_rejected_email(to_email, item_type):
    html = f"""
    <html>
      <body>
        <h3>❌ Match Rejected</h3>
        <p>
          The match for your item <b>{item_type}</b> was not approved.
        </p>
        <p>
          Don’t worry — we’ll continue looking for new matches.
        </p>
      </body>
    </html>
    """
    send_email(to_email, "Match Update - ReClaim", html)


def send_item_recovered_email(to_email, item_type):
    subject = "Item Successfully Recovered ✅"
    html = f"""
    <html>
      <body>
        <p>Hi,<br><br>
        We’re happy to inform you that your item <b>{item_type}</b> has been successfully recovered.<br><br>
        Thank you for using ReClaim!
        </p>
      </body>
    </html>
    """

    send_email(to_email, subject, html)




def create_notification(
    db,
    user_id,
    title,
    message,
    notification_type,
    item_id=None,
    match_id=None
):
    from models import Notification

    notification = Notification(
        user_id=user_id,
        item_id=item_id,
        match_id=match_id,
        title=title,
        message=message,
        notification_type=notification_type
    )

    db.add(notification)
    db.commit()
    db.refresh(notification)

    return notification


def notify_match_found(db, user, item, match):
    create_notification(
        db=db,
        user_id=user.user_id,
        item_id=item.item_id,
        match_id=match.match_id,
        title="Possible Match Found",
        message="A possible match was found for your item.",
        notification_type="MATCH_FOUND"
    )

    send_match_found_email(user.email, item.item_type)


def notify_match_approved(db, user, item, match):
    create_notification(
        db=db,
        user_id=user.user_id,
        item_id=item.item_id,
        match_id=match.match_id,
        title="Match Approved",
        message="Your item match has been approved.",
        notification_type="MATCH_APPROVED"
    )

    send_match_approved_email(user.email, item.item_type)


def notify_match_rejected(db, user, item, match):
    create_notification(
        db=db,
        user_id=user.user_id,
        item_id=item.item_id,
        match_id=match.match_id,
        title="Match Rejected",
        message="Your item match was rejected after review.",
        notification_type="MATCH_REJECTED"
    )

    send_match_rejected_email(user.email, item.item_type)


def notify_item_recovered(db, user, item):
    create_notification(
        db=db,
        user_id=user.user_id,
        item_id=item.item_id,
        title="Item Recovered",
        message="Your item has been successfully recovered.",
        notification_type="ITEM_RECOVERED"
    )

    send_item_recovered_email(user.email, item.item_type)

