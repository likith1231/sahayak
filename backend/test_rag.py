import asyncio
from app.database import SessionLocal
from app.routers.agent import router
# The actual tool is defined inside chat_with_agent locally. But let's just test the chat_with_agent endpoint!
import requests

try:
    # We need a valid token. Let's get one!
    # Login as farmer
    login_resp = requests.post("http://localhost:8000/api/auth/login", json={"phone": "9999999900", "password": "password123"})
    token = login_resp.json().get("token")
    if not token:
        print("Failed to login:", login_resp.text)
        exit(1)
        
    # Query the agent
    resp = requests.post("http://localhost:8000/api/agent/chat", json={"message": "What is the price of tomatoes in Kolar?"}, headers={"Authorization": f"Bearer {token}"})
    print("Agent Response Status:", resp.status_code)
    print("Agent Reply:", resp.json())
except Exception as e:
    print("Error:", e)
