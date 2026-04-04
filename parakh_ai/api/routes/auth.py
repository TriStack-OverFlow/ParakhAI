from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import requests
import os
import logging

logger = logging.getLogger(__name__)

from parakh_ai.api.telegram_bot import generate_link_token

router = APIRouter()

CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
MAILBLUSTER_API_KEY = os.getenv("MAILBLUSTER_API_KEY", "")
SENDER_EMAIL = os.getenv("SENDER_EMAIL", "")

class GoogleAuthRequest(BaseModel):
    token: str

@router.get("/telegram-token")
def get_telegram_token(email: str):
    token = generate_link_token(email)
    return {"token": token, "bot_url": f"https://t.me/parakhbot?start={token}"}

@router.post("/google")
def google_auth(req: GoogleAuthRequest):
    try:
        user_info_url = "https://www.googleapis.com/oauth2/v3/userinfo"
        res = requests.get(user_info_url, headers={"Authorization": f"Bearer {req.token}"})

        if res.status_code != 200:
            raise ValueError(f"Invalid access token. Google returned: {res.text}")

        user_info = res.json()
        email = user_info["email"]
        name = user_info.get("name", "")
        picture = user_info.get("picture", "")

        try:
            # TODO: REPLACE WITH YOUR BREVO API KEY
            api_key = os.getenv("BREVO_API_KEY", "")
            if not api_key:
                print("Warning: BREVO_API_KEY is not set.")
            mb_url = "https://api.brevo.com/v3/smtp/email"
            headers = {
                "api-key": api_key,
                "Content-Type": "application/json"
            }
            data = {
                "sender": {"name": "Parakh.AI", "email": SENDER_EMAIL},
                "to": [{"email": email, "name": name}],
                "subject": "Welcome to Parakh.AI! 🚀 Let's get started",
                "htmlContent": f"<html><body><h3>Hi {name},</h3><p>Welcome to <strong>Parakh.AI</strong>! We are thrilled to have you on board.</p><p>Head over to your <a href='http://localhost:5173/dashboard'>Dashboard</a> to start setting up your first workspace.</p><br><p>Best regards,<br>The Parakh.AI Team</p></body></html>"
            }
            mb_response = requests.post(mb_url, json=data, headers=headers, timeout=5)
            if mb_response.status_code not in [200, 201]:
                print(f"Brevo failed: {mb_response.status_code} - {mb_response.text}")
            else:
                print(f"Welcome email successfully sent to {email} via Brevo!")
        except Exception as mb_error:
            print(f"Email request error: {mb_error}")

        return {
            "status": "success",
            "token": req.token,
            "user": {
                "email": email,
                "name": name,
                "picture": picture
            }
        }
    except ValueError as ve:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(ve)}")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
