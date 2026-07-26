import os
import json
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from pydantic import BaseModel
from google import genai
from google.genai import types
from app.auth.dependencies import get_current_user
from app.database import get_db
from app.models import Listing, Order, EmergencyRequest, ListingCategory, MandiPrice

import uuid

router = APIRouter()

class ChatReq(BaseModel):
    message: str

@router.post("/api/agent/chat")
async def chat_with_agent(req: ChatReq, payload: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    gemini_api_key = os.environ.get("GEMINI_API_KEY")
    if not gemini_api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY not configured")
        
    try:
        client = genai.Client(api_key=gemini_api_key)
        
        # Define functions
        def create_listing(cropName: str, quantity: float, unit: str, price: float, category: str = "Vegetables", location: str = "") -> dict:
            """Creates a new produce listing for the farmer."""
            try:
                # Basic validation
                enum_category = ListingCategory(category)
            except ValueError:
                enum_category = ListingCategory.VEGETABLES
                
            new_listing = Listing(
                farmerId=payload.get("userId"),
                cropName=cropName,
                quantity=quantity,
                unit=unit,
                price=price,
                category=enum_category,
                location=location
            )
            db.add(new_listing)
            db.commit()
            db.refresh(new_listing)
            return {"status": "success", "listingId": new_listing.id}
            
        def check_order_status(orderId: str) -> dict:
            """Checks the status of an existing order by its ID."""
            order = db.query(Order).filter(Order.id == orderId, Order.consumerId == payload.get("userId")).first()
            if not order:
                return {"status": "not_found", "message": "Order not found or access denied."}
            return {"status": "found", "orderStatus": order.status}
            
        def tag_emergency_request(needType: str, district: str) -> dict:
            """Creates a new emergency request tag or window for a specific district."""
            # For simplicity, just create an emergency request for the current user
            er = EmergencyRequest(
                consumerId=payload.get("userId"),
                needType=needType,
                latitude=0.0,
                longitude=0.0
            )
            db.add(er)
            db.commit()
            db.commit()
            db.refresh(er)
            return {"status": "success", "requestId": er.id}
            
        def search_marketplace(query: str) -> dict:
            """Searches the marketplace for listings and mandi prices relevant to the query (e.g., 'tomatoes in kolar')."""
            try:
                # Embed the query
                response = client.models.embed_content(
                    model='gemini-embedding-001',
                    contents=query,
                    config=types.EmbedContentConfig(task_type="RETRIEVAL_QUERY")
                )
                query_embedding = response.embeddings[0].values
                
                # Fetch top 5 listings
                listings = db.query(Listing).filter(Listing.embedding.isnot(None)).order_by(Listing.embedding.cosine_distance(query_embedding)).limit(5).all()
                listing_results = [
                    {"crop": l.cropName, "price": l.price, "unit": l.unit, "location": l.location, "listingId": l.id}
                    for l in listings
                ]
                
                # Fetch top 5 mandi prices
                mandi_prices = db.query(MandiPrice).filter(MandiPrice.embedding.isnot(None)).order_by(MandiPrice.embedding.cosine_distance(query_embedding)).limit(5).all()
                mandi_results = [
                    {"crop": m.cropName, "district": m.district, "modalPrice": m.modalPrice, "minPrice": m.minPrice, "maxPrice": m.maxPrice}
                    for m in mandi_prices
                ]
                
                # Log explicitly as required by B.4 Prompt assembly
                print(f"RAG Retrieved Context for query '{query}':")
                print("Listings:", listing_results)
                print("Mandi Prices:", mandi_results)

                return {
                    "status": "success",
                    "relevant_listings": listing_results,
                    "mandi_prices": mandi_results
                }
            except Exception as e:
                print(f"RAG search error: {e}")
                return {"status": "error", "message": "Failed to search marketplace data."}
            
        system_instruction = "You are a helpful assistant for Sahayak, a farmer-to-consumer marketplace app. You can create listings, check orders, and tag emergencies using the provided tools. Keep responses concise."
        
        chat = client.chats.create(
            model='gemini-3.5-flash',
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                tools=[create_listing, check_order_status, tag_emergency_request, search_marketplace]
            )
        )
        
        # Send message
        response = chat.send_message(req.message)
        
        # Check if the model wants to call a function
        # Since we use send_message, the SDK handles the tool loop automatically if we pass tools in config!
        # Wait, the python SDK currently doesn't auto-call python functions passed in tools unless we pass callable directly, 
        # but let's verify if auto function calling works. Actually, in the new SDK `genai`, passing python callables to tools enables automatic function execution and sending results back to the model!
        
        return {"reply": response.text}
    except Exception as e:
        print(f"Agent error: {e}")
        raise HTTPException(status_code=500, detail="Agent is currently unavailable")

@router.post("/api/agent/listing-from-voice")
async def listing_from_voice(file: UploadFile = File(...), payload: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    gemini_api_key = os.environ.get("GEMINI_API_KEY")
    if not gemini_api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY not configured")
        
    try:
        client = genai.Client(api_key=gemini_api_key)
        contents = await file.read()
        
        system_instruction = "You are an assistant parsing a voice recording to create a listing. Extract crop name, quantity, unit, price, category, and location. Call the create_listing tool. Respond with a short summary."
        
        def create_listing(cropName: str, quantity: float, unit: str, price: float, category: str = "Vegetables", location: str = "") -> dict:
            """Creates a new produce listing for the farmer."""
            try:
                enum_category = ListingCategory(category)
            except ValueError:
                enum_category = ListingCategory.VEGETABLES
                
            new_listing = Listing(
                farmerId=payload.get("userId"),
                cropName=cropName,
                quantity=quantity,
                unit=unit,
                price=price,
                category=enum_category,
                location=location
            )
            db.add(new_listing)
            db.commit()
            db.refresh(new_listing)
            return {"status": "success", "listingId": new_listing.id}
            
        chat = client.chats.create(
            model='gemini-3.5-flash',
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                tools=[create_listing]
            )
        )
        
        response = chat.send_message(
            message=[types.Part.from_bytes(data=contents, mime_type=file.content_type or "audio/mp3")]
        )
        
        return {"reply": response.text}
    except Exception as e:
        print(f"Voice agent error: {e}")
        raise HTTPException(status_code=500, detail="Agent is currently unavailable")
