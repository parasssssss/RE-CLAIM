import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

def send_reset_email(to_email, reset_link):
    sender_email = "info.reclaimm@gmail.com"
    sender_password = "bdda ebyi qebg awlg"  
    
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
