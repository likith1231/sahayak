from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import random
from typing import Optional
from google import genai
from google.genai import types
import os

app = FastAPI(title="Sahayak ML Microservice")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PricePredictionRes(BaseModel):
    cropName: str
    location: str
    predictedPrice: float
    confidenceScore: float

@app.get("/predict-price", response_model=PricePredictionRes)
def predict_price(cropName: str, location: str = "Karnataka"):
    """
    Mock Scikit-learn regression model for price prediction based on historical data.
    In a real scenario, we would load a .joblib model trained on Agmarknet data here.
    """
    # Mocking prediction based on crop name length/hash
    base_price = (hash(cropName) % 1500) + 20
    # Add random fluctuation (-10% to +10%)
    fluctuation = base_price * random.uniform(-0.1, 0.1)
    predicted_price = round(base_price + fluctuation, 2)
    confidence = round(random.uniform(0.75, 0.95), 2)
    
    return PricePredictionRes(
        cropName=cropName,
        location=location,
        predictedPrice=predicted_price,
        confidenceScore=confidence
    )

class GradeCropRes(BaseModel):
    qualityGrade: str
    reasoning: str

@app.post("/grade-crop", response_model=GradeCropRes)
async def grade_crop(file: UploadFile = File(...)):
    """
    Uses Gemini Vision API to grade a crop's quality from a photo.
    """
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        # Fallback if no key provided
        return GradeCropRes(qualityGrade="B", reasoning="Fallback due to missing Gemini API key.")
        
    try:
        contents = await file.read()
        
        client = genai.Client(api_key=api_key)
        
        prompt = "Analyze this crop image and assign a quality grade from ['A', 'B', 'C']. A is excellent/premium, B is standard/acceptable, C is poor/damaged. Also provide a brief 1-sentence reasoning. Output strictly JSON with keys 'qualityGrade' and 'reasoning'."
        
        response = client.models.generate_content(
            model='gemini-3.5-flash',
            contents=[
                types.Part.from_bytes(data=contents, mime_type=file.content_type or "image/jpeg"),
                prompt
            ],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
            )
        )
        
        # Parse response
        import json
        result = json.loads(response.text)
        
        return GradeCropRes(
            qualityGrade=result.get("qualityGrade", "B"),
            reasoning=result.get("reasoning", "Analysis successful.")
        )
    except Exception as e:
        print(f"Error grading crop: {e}")
        # Return fallback on error
        return GradeCropRes(qualityGrade="B", reasoning=f"Error during analysis: {str(e)}")
