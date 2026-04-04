import httpx
import asyncio
import logging
import os
import uuid

TELEGRAM_TOKEN = os.getenv("TELEGRAM_API_KEY", "8767196265:AAHVcvN3yImDjY2PZIIosR_LQ-UhGpSyokY")
BASE_URL = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}"

logger = logging.getLogger("telegram_bot")

# In-memory storage for linking
pending_links = {}   # token -> email
linked_users = {}    # chat_id -> email

def generate_link_token(email: str) -> str:
    token = str(uuid.uuid4())[:8]
    pending_links[token] = email
    return token

async def start_telegram_polling():
    last_update_id = None
    logger.info("Starting Telegram Bot Polling in background...")
    
    async with httpx.AsyncClient(timeout=35.0) as client:
        while True:
            try:
                url = f"{BASE_URL}/getUpdates"
                params = {"timeout": 30, "limit": 10}
                if last_update_id is not None:
                    params["offset"] = last_update_id + 1
                
                resp = await client.get(url, params=params)
                if resp.status_code == 200:
                    data = resp.json()
                    
                    if data.get("ok"):
                        updates = data.get("result", [])
                        for update in updates:
                            update_id = update["update_id"]
                            last_update_id = update_id
                            
                            message = update.get("message")
                            if not message:
                                continue
                                
                            chat_id = message["chat"]["id"]
                            
                            # Determine if user is linked
                            user_email = linked_users.get(str(chat_id))

                            # Handle incoming photo
                            if "photo" in message:
                                if not user_email:
                                    await client.post(f"{BASE_URL}/sendMessage", json={
                                        "chat_id": chat_id,
                                        "text": "?? Your account is not linked. Please login to your Parakh.AI web dashboard and click 'Connect Telegram' first!"
                                    })
                                    continue

                                # Acknowledge photo receipt
                                await client.post(f"{BASE_URL}/sendMessage", json={
                                    "chat_id": chat_id,
                                    "text": f"?? Image received from {user_email}! Parakh.AI is running inference..."
                                })
                                
                                # Note: Pass image to parakh_ai.pipeline.inference here
                                await asyncio.sleep(2) # Mock inference time for now
                                
                                # Send mock result back
                                await client.post(f"{BASE_URL}/sendMessage", json={
                                    "chat_id": chat_id,
                                    "text": "? Inference Complete!\n\nStatus: PASS\nAnomaly Score: 0.05\nConfidence: 99.1%\n\nNo major defects detected."
                                })
                                
                            # Handle incoming text
                            elif "text" in message:
                                text = message["text"]
                                if text.startswith("/start"):
                                    # Check for Deep Link token (e.g. /start 12345678)
                                    parts = text.split(" ")
                                    if len(parts) > 1:
                                        token = parts[1]
                                        if token in pending_links:
                                            linked_email = pending_links[token]
                                            linked_users[str(chat_id)] = linked_email
                                            del pending_links[token]
                                            await client.post(f"{BASE_URL}/sendMessage", json={
                                                "chat_id": chat_id,
                                                "text": f"? Success! Your Telegram is now securely linked to the Parakh.AI account: {linked_email}\n\nYou can now send photos directly to me to process them on your dashboard!"
                                            })
                                        else:
                                            await client.post(f"{BASE_URL}/sendMessage", json={
                                                "chat_id": chat_id,
                                                "text": "? Invalid or expired linking token. Please try connecting from your dashboard again."
                                            })
                                    else:
                                        await client.post(f"{BASE_URL}/sendMessage", json={
                                            "chat_id": chat_id,
                                            "text": "Welcome to the Parakh.AI Telegram Bot! ??\n\nPlease link your account from the Web Dashboard first. Once linked, you can send me images for instant inspection."
                                        })
                                else:
                                    await client.post(f"{BASE_URL}/sendMessage", json={
                                        "chat_id": chat_id,
                                        "text": "Send me an image of a component to instantly inspect it."
                                    })
                                    
            except Exception as e:
                logger.error(f"Telegram polling error: {e}")
                await asyncio.sleep(5)
            
            await asyncio.sleep(0.5)
