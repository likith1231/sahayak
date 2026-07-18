from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.models import EmergencyRequest, RequestStatus, NGO
from app.schemas import EmergencyCreateReq
from app.auth.dependencies import get_current_user, get_current_ngo

router = APIRouter()

@router.post("/api/emergency")
def create_emergency(req: EmergencyCreateReq, db: Session = Depends(get_db), payload: dict = Depends(get_current_user)):
    try:
        new_req = EmergencyRequest(
            consumerId=payload["userId"],
            latitude=req.latitude,
            longitude=req.longitude,
            needType=req.needType
        )
        db.add(new_req)
        db.commit()
        db.refresh(new_req)
        
        return {"emergencyRequest": {
            "id": new_req.id,
            "consumerId": new_req.consumerId,
            "latitude": new_req.latitude,
            "longitude": new_req.longitude,
            "needType": new_req.needType,
            "status": new_req.status.value,
            "createdAt": new_req.createdAt.isoformat(),
            "claimedById": new_req.claimedById
        }}
    except Exception as e:
        print(e)
        db.rollback()
        return JSONResponse(status_code=500, content={"error": "Failed to create request"})

@router.get("/api/emergency")
def get_emergencies(db: Session = Depends(get_db)):
    try:
        requests = db.query(EmergencyRequest).options(joinedload(EmergencyRequest.consumer)).filter(EmergencyRequest.status == RequestStatus.OPEN).order_by(EmergencyRequest.createdAt.desc()).all()
        
        result = []
        for r in requests:
            result.append({
                "id": r.id,
                "consumerId": r.consumerId,
                "latitude": r.latitude,
                "longitude": r.longitude,
                "needType": r.needType,
                "status": r.status.value,
                "createdAt": r.createdAt.isoformat(),
                "claimedById": r.claimedById,
                "consumer": {
                    "name": r.consumer.name,
                    "phone": r.consumer.phone
                } if r.consumer else None
            })
        return {"emergencyRequests": result}
    except Exception as e:
        print(e)
        return JSONResponse(status_code=500, content={"error": "Failed to fetch requests"})

@router.patch("/api/emergency/{id}/claim")
def claim_emergency(id: str, db: Session = Depends(get_db), payload: dict = Depends(get_current_ngo)):
    try:
        ngo_profile = db.query(NGO).filter(NGO.userId == payload["userId"]).first()
        if not ngo_profile or not ngo_profile.verificationStatus:
            return JSONResponse(status_code=403, content={"error": "NGO not yet verified"})
            
        with db.begin_nested():
            em_req = db.query(EmergencyRequest).with_for_update().filter(EmergencyRequest.id == id).first()
            if not em_req:
                return JSONResponse(status_code=404, content={"error": "Request not found"})
            if em_req.status != RequestStatus.OPEN:
                return JSONResponse(status_code=409, content={"error": "Request is not open"})
                
            em_req.status = RequestStatus.CLAIMED
            em_req.claimedById = payload["userId"]
        db.commit()
        return {"message": "Request claimed"}
    except Exception as e:
        print(e)
        db.rollback()
        return JSONResponse(status_code=500, content={"error": "Failed to claim request"})

@router.patch("/api/emergency/{id}/fulfill")
def fulfill_emergency(id: str, db: Session = Depends(get_db), payload: dict = Depends(get_current_ngo)):
    try:
        ngo_profile = db.query(NGO).filter(NGO.userId == payload["userId"]).first()
        if not ngo_profile or not ngo_profile.verificationStatus:
            return JSONResponse(status_code=403, content={"error": "NGO not yet verified"})
            
        with db.begin_nested():
            em_req = db.query(EmergencyRequest).with_for_update().filter(EmergencyRequest.id == id).first()
            if not em_req:
                return JSONResponse(status_code=404, content={"error": "Request not found"})
            if em_req.status != RequestStatus.CLAIMED:
                return JSONResponse(status_code=409, content={"error": "Request is not claimed"})
            if em_req.claimedById != payload["userId"]:
                return JSONResponse(status_code=403, content={"error": "Not authorized to fulfill this request"})
                
            em_req.status = RequestStatus.FULFILLED
        db.commit()
        return {"message": "Request fulfilled"}
    except Exception as e:
        print(e)
        db.rollback()
        return JSONResponse(status_code=500, content={"error": "Failed to fulfill request"})
