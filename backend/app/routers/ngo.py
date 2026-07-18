from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import NGO
from app.schemas import NGORegisterReq
from app.auth.dependencies import get_current_ngo

router = APIRouter()

@router.post("/api/ngo/register")
def register_ngo(req: NGORegisterReq, db: Session = Depends(get_db), payload: dict = Depends(get_current_ngo)):
    try:
        existing = db.query(NGO).filter(NGO.userId == payload["userId"]).first()
        if existing:
            return JSONResponse(status_code=409, content={"error": "NGO profile already exists"})
            
        new_ngo = NGO(
            userId=payload["userId"],
            organizationName=req.organizationName,
            documentUrl=req.documentUrl,
            verificationStatus=False
        )
        db.add(new_ngo)
        db.commit()
        db.refresh(new_ngo)
        
        return {"ngo": {
            "id": new_ngo.id,
            "userId": new_ngo.userId,
            "organizationName": new_ngo.organizationName,
            "verificationStatus": new_ngo.verificationStatus,
            "documentUrl": new_ngo.documentUrl,
            "createdAt": new_ngo.createdAt.isoformat()
        }}
    except Exception as e:
        print(e)
        db.rollback()
        return JSONResponse(status_code=500, content={"error": "Failed to register NGO"})

@router.get("/api/ngo/me")
def get_my_ngo(db: Session = Depends(get_db), payload: dict = Depends(get_current_ngo)):
    try:
        ngo = db.query(NGO).filter(NGO.userId == payload["userId"]).first()
        if not ngo:
            return JSONResponse(status_code=404, content={"error": "NGO profile not found"})
            
        return {"ngo": {
            "id": ngo.id,
            "userId": ngo.userId,
            "organizationName": ngo.organizationName,
            "verificationStatus": ngo.verificationStatus,
            "documentUrl": ngo.documentUrl,
            "createdAt": ngo.createdAt.isoformat()
        }}
    except Exception as e:
        print(e)
        return JSONResponse(status_code=500, content={"error": "Failed to fetch NGO profile"})
