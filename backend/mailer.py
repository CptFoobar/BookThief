import smtplib
import os
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from database import log_debug

def send_to_kindle(file_path, smtp_server, smtp_port, smtp_user, smtp_password, kindle_email):
    if not os.path.exists(file_path):
        log_debug(f"File not found for mailing: {file_path}")
        return False, "File not found"

    try:
        log_debug(f"Preparing email for {kindle_email} with file {file_path}")
        
        msg = MIMEMultipart()
        msg['From'] = smtp_user
        msg['To'] = kindle_email
        msg['Subject'] = "Book Delivery"

        # Attach the file
        filename = os.path.basename(file_path)
        with open(file_path, "rb") as attachment:
            part = MIMEBase("application", "octet-stream")
            part.set_payload(attachment.read())
            encoders.encode_base64(part)
            part.add_header(
                "Content-Disposition",
                f"attachment; filename= {filename}",
            )
            msg.attach(part)

        # Connect and send
        log_debug(f"Connecting to SMTP server {smtp_server}:{smtp_port}")
        server = smtplib.SMTP(smtp_server, int(smtp_port))
        server.starttls()
        server.login(smtp_user, smtp_password)
        server.send_message(msg)
        server.quit()
        
        log_debug(f"Email sent successfully to {kindle_email}")
        return True, "Success"
    except Exception as e:
        error_msg = str(e)
        log_debug(f"SMTP Error: {error_msg}")
        return False, error_msg
