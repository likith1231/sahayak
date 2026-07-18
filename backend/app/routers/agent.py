import os
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from google import genai
from google.genai import types
from app.auth.dependencies import get_current_user
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

class ChatReq(BaseModel):
    message: str

@router.post("/api/agent/chat")
async def chat_with_agent(req: ChatReq, payload: dict = Depends(get_current_user)):
    gemini_api_key = os.environ.get("GEMINI_API_KEY")
    if not gemini_api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY not configured")
        
    try:
        client = genai.Client(api_key=gemini_api_key)
        
        system_instruction = "You are a helpful assistant for Sahayak, a farmer-to-consumer marketplace app. Help farmers with listing produce, help consumers with orders, and explain how the app works. Keep responses concise and simple."
        
        response = client.models.generate_content(
            model='gemini-3.5-flash',
            contents=req.message,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
            )
        )
        
        return {"reply": response.text}
    except Exception as e:
        print(f"Agent error: {e}")
        raise HTTPException(status_code=500, detail="Agent is currently unavailable")
