from fastapi import APIRouter, HTTPException, Depends
from google.oauth2 import id_token
from google.auth.transport import requests
import jwt
import datetime

from parakh_ai.api.schemas import GoogleTokenRequest, AuthResponseModel, UserResponse
import os
import logging
import requests as sync_requests

router = APIRouter()

CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "1096135752260-t9805k4oj76q2sre5qn7f62nkerokitg.apps.googleusercontent.com")
BREVO_API_KEY = os.getenv("BREVO_API_KEY")
SENDER_EMAIL = os.getenv("SENDER_EMAIL", "utkarsh10a42.hts21@gmail.com")

# The client ID is usually checked against the frontend's client ID,
# but for a dev prototype/hackathon we can skip strict audience verification
# by not passing the specific audience, or by using a secret key.
JWT_SECRET = "super-secret-parakhai-hackathon-key"

@router.post("/google", response_model=AuthResponseModel)
async def google_auth(request: GoogleTokenRequest):
    try:
        import httpx
        # The frontend's useGoogleLogin hook returns an access token via implicit flow.
        # We need to fetch the user info using the access token from Google's userinfo API.
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {request.token}"}
            )
            
            if response.status_code != 200:
                raise ValueError(f"Invalid access token: {response.text}")
            
            idinfo = response.json()

        user_id = idinfo["sub"]
        email = idinfo.get("email")
        name = idinfo.get("name")
        picture = idinfo.get("picture")

        try:
            brevo_url = "https://api.brevo.com/v3/smtp/email"
            headers = {
                "api-key": BREVO_API_KEY,
                "Content-Type": "application/json",
                "Accept": "application/json"
            }
            data = {
                "sender": {"email": SENDER_EMAIL, "name": "Parakh.AI"},
                "to": [{"email": email, "name": name}],
                "subject": "Welcome to Parakh.AI!",
                "htmlContent": f"<html><body><h1>Welcome to Parakh.AI, {name}!</h1><p>We are thrilled to have you onboard.</p></body></html>"
            }
            brevo_response = sync_requests.post(brevo_url, json=data, headers=headers, timeout=5)
            if brevo_response.status_code not in [200, 201, 202]:
                logging.getLogger(__name__).warning(f"Brevo failed: {brevo_response.status_code} - {brevo_response.text}")
            else:
                logging.getLogger(__name__).info(f"Welcome email successfully sent via Brevo for {email}!")
        except Exception as mail_error:
            logging.getLogger(__name__).error(f"Email request error: {mail_error}")

        # Create our own JWT Session Token
        expiration = datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        payload = {
            "sub": user_id,
            "email": email,
            "name": name,
            "role": "operator",
            "exp": expiration
        }
        
        encoded_jwt = jwt.encode(payload, JWT_SECRET, algorithm="HS256")

        return AuthResponseModel(
            token=encoded_jwt,
            user=UserResponse(
                id=user_id,
                email=email,
                name=name,
                picture=picture,
                role="operator"
            )
        )
    except ValueError as e:
        # Invalid token
        raise HTTPException(status_code=401, detail=f"Invalid Google token: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
