from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import httpx

router = APIRouter()

class TranslateReq(BaseModel):
    text: str
    targetLang: str

@router.post("/api/translate")
async def translate_text(req: TranslateReq):
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api.mymemory.translated.net/get",
                params={
                    "q": req.text,
                    "langpair": f"en|{req.targetLang}",
                    "de": "sahayak.project@example.com"
                },
                timeout=10.0
            )
            response.raise_for_status()
            data = response.json()
            return {"translatedText": data.get("responseData", {}).get("translatedText", "")}
    except Exception as e:
        print(f"Translation error: {e}")
        return JSONResponse(
            status_code=503,
            content={"error": "Translation service is currently unavailable. Please try again later."}
        )
