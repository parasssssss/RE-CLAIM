import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from dotenv import load_dotenv
from models import Notification  # Ensure this import works based on your project structure

load_dotenv()

# ==========================================
# 1. CORE EMAIL SENDER (SMTP)
# ==========================================
def send_email(to_email: str, subject: str, html_body: str):
    try:
        sender_email = "info.reclaimm@gmail.com"
        sender_password = os.getenv("APP_PASSWORD")

        if not sender_password:
            print("❌ Error: APP_PASSWORD not found in environment variables.")
            return

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = sender_email
        msg["To"] = to_email
        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(sender_email, sender_password)
            server.sendmail(sender_email, to_email, msg.as_string())

        print(f"✅ Email sent to {to_email}")

    except Exception as e:
        print(f"❌ Email failed to {to_email}: {e}")


def send_reset_email(to_email, reset_link):
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
    send_email(to_email, "Password Reset - Reclaim", html)


# ==========================================
# 2. HTML GENERATORS & SENDERS
# ==========================================

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
    send_email(to_email, "Item Successfully Recovered ✅", html)


# ==========================================
# 3. DATABASE LOGIC (Synchronous)
# Call this inside your Router functions
# ==========================================
def create_notification(
    db,
    user_id,
    title,
    message,
    notification_type,
    item_id=None,
    match_id=None
):
    """
    Creates a notification record in the database.
    """
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


# ==========================================
# 4. BACKGROUND TASK WRAPPERS (Async Safe)
# Pass these to background_tasks.add_task()
# ==========================================

def send_match_found_task(user_email: str, item_type: str):
    """Safe for BackgroundTasks - No DB session required"""
    send_match_found_email(user_email, item_type)

def send_match_approved_task(user_email: str, item_type: str):
    """Safe for BackgroundTasks - No DB session required"""
    send_match_approved_email(user_email, item_type)

def send_match_rejected_task(user_email: str, item_type: str):
    """Safe for BackgroundTasks - No DB session required"""
    send_match_rejected_email(user_email, item_type)

def send_item_recovered_task(user_email: str, item_type: str):
    """Safe for BackgroundTasks - No DB session required"""
    send_item_recovered_email(user_email, item_type)