from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import requests
import os
import logging

logger = logging.getLogger(__name__)

from parakh_ai.api.telegram_bot import generate_link_token

router = APIRouter()

CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "1096135752260-t9805k4oj76q2sre5qn7f62nkerokitg.apps.googleusercontent.com")
MAILBLUSTER_API_KEY = os.getenv("MAILBLUSTER_API_KEY", "83f4115e-c76c-4445-9b38-c618fd46a820")
SENDER_EMAIL = os.getenv("SENDER_EMAIL", "utkarsh10a42.hts21@gmail.com")

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
            mb_url = "https://api.mailbluster.com/api/leads"
            headers = {
                "Authorization": MAILBLUSTER_API_KEY,
                "Content-Type": "application/json"
            }
            data = {
                "email": email,
                "firstName": name,
                "subscribed": True,
                "tags": ["ParakhAI_User", "Welcome_Email_Trigger"]
            }
            mb_response = requests.post(mb_url, json=data, headers=headers, timeout=5)
            if mb_response.status_code not in [200, 201]:
                print(f"Mailbluster failed: {mb_response.status_code} - {mb_response.text}")
            else:
                print(f"Welcome email successfully triggered via Mailbluster for {email}!") 
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
