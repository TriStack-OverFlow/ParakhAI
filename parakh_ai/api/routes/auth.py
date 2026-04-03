from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import requests
import os
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

router = APIRouter()

CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "1096135752260-t9805k4oj76q2sre5qn7f62nkerokitg.apps.googleusercontent.com")
MAILBLUSTER_API_KEY = os.getenv("MAILBLUSTER_API_KEY", "83f4115e-c76c-4445-9b38-c618fd46a820")
SENDER_EMAIL = os.getenv("SENDER_EMAIL", "utkarsh10a42.hts21@gmail.com")

class GoogleAuthRequest(BaseModel):
    token: str

@router.post("/google")
def google_auth(req: GoogleAuthRequest):
    try:
        idinfo = id_token.verify_oauth2_token(req.token, google_requests.Request(), CLIENT_ID)
        
        email = idinfo['email']
        name = idinfo.get('name', '')
        
        # Subscribe user to MailBluster
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
            res = requests.post(mb_url, json=data, headers=headers)
            print(f"Mailbluster status: {res.status_code}")
            
            # Send welcome email using MailBluster Campaigns API or trigger via segments 
            # (In production, usually handled through automated campaigns based on the tags or lead creation, but we can trigger it)
            # MailBluster recommends setting up an Automation or Campaign via their dashboard
        except Exception as e:
            print(f"Error subscribing to Mailbluster: {str(e)}")
