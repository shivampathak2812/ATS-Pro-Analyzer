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
        msg['Subject'] = "Your ATS Pro Analyser Verification Code"

        body = f"""
        Hello,

        Thank you for registering with ATS Pro Analyser.
        Your 6-digit verification code is: {otp_code}

        This code will expire in 10 minutes.
        If you did not request this, please ignore this email.

        Best regards,
        The ATS Pro Analyser Team
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

def send_reset_email(to_email: str, reset_token: str):
    reset_link = f"{settings.APP_URL}/reset-password.html?token={reset_token}"

    if settings.SMTP_EMAIL == "your_email@gmail.com":
        print(f"\n{'='*50}\n[DEV MODE] Reset link for {to_email}:\n{reset_link}\n{'='*50}\n")
        return True

    try:
        msg = MIMEMultipart()
        msg['From'] = settings.SMTP_EMAIL
        msg['To'] = to_email
        msg['Subject'] = "ATS Pro — Password Reset Link"

        body = f"""
        Hello,

        Click the link below to reset your password:
        {reset_link}

        This link will expire in 15 minutes.
        If you did not request this, please ignore this email.

        Best regards,
        The ATS Pro Analyser Team
        """
        msg.attach(MIMEText(body, 'plain'))

        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(settings.SMTP_EMAIL, settings.SMTP_PASSWORD)
        server.sendmail(settings.SMTP_EMAIL, to_email, msg.as_string())
        server.quit()
        return True
    except Exception as e:
        print(f"Failed to send reset email: {e}")
        return False
