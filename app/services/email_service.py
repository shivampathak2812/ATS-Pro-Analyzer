import smtplib
import random
import string
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings

def generate_otp() -> str:
    return "".join(random.choices(string.digits, k=6))

def send_otp_email(to_email: str, otp_code: str):
    # If the user hasn't configured SMTP, just print it to the terminal for development
    if settings.SMTP_EMAIL == "your_email@gmail.com":
        print(f"\n{'='*50}\n[DEV MODE] OTP for {to_email} is: {otp_code}\n{'='*50}\n")
        return True

    try:
        msg = MIMEMultipart()
        msg['From'] = settings.SMTP_EMAIL
        msg['To'] = to_email
        msg['Subject'] = "Your ATS Pro 2.0 Verification Code"

        body = f"""
        Hello,

        Thank you for registering with ATS Pro 2.0.
        Your 6-digit verification code is: {otp_code}

        This code will expire in 10 minutes.
        If you did not request this, please ignore this email.

        Best regards,
        The ATS Pro Team
        """
        msg.attach(MIMEText(body, 'plain'))

        # Assuming Gmail SMTP setup
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(settings.SMTP_EMAIL, settings.SMTP_PASSWORD)
        text = msg.as_string()
        server.sendmail(settings.SMTP_EMAIL, to_email, text)
        server.quit()
        return True
    except Exception as e:
        print(f"Failed to send email: {e}")
        return False
