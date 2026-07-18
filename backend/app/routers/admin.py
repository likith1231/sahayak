from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.models import NGO
from app.auth.dependencies import get_current_admin

router = APIRouter()

@router.get("/api/admin/ngos/pending")
def get_pending_ngos(db: Session = Depends(get_db), payload: dict = Depends(get_current_admin)):
    try:
        ngos = db.query(NGO).options(joinedload(NGO.user)).filter(NGO.verificationStatus == False).all()
        result = []
        for n in ngos:
            result.append({
                "id": n.id,
                "userId": n.userId,
                "organizationName": n.organizationName,
                "verificationStatus": n.verificationStatus,
                "documentUrl": n.documentUrl,
                "createdAt": n.createdAt.isoformat(),
                "user": {
                    "name": n.user.name,
                    "phone": n.user.phone,
                    "email": n.user.email
                }
            })
        return {"ngos": result}
    except Exception as e:
        print(e)
        return JSONResponse(status_code=500, content={"error": "Failed to fetch pending NGOs"})

@router.patch("/api/admin/ngos/{id}/verify")
def verify_ngo(id: str, db: Session = Depends(get_db), payload: dict = Depends(get_current_admin)):
    try:
        ngo = db.query(NGO).filter(NGO.id == id).first()
        if not ngo:
            return JSONResponse(status_code=404, content={"error": "NGO not found"})
            
        ngo.verificationStatus = True
        db.commit()
        return {"message": "NGO verified successfully"}
    except Exception as e:
        print(e)
        db.rollback()
        return JSONResponse(status_code=500, content={"error": "Failed to verify NGO"})
