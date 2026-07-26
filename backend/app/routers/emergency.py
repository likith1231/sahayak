from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.models import EmergencyRequest, RequestStatus, NGO
from app.schemas import EmergencyCreateReq
from app.auth.dependencies import get_current_user, get_current_ngo, get_current_admin
from pydantic import BaseModel

router = APIRouter()

@router.post("/api/emergency")
def create_emergency(req: EmergencyCreateReq, db: Session = Depends(get_db), payload: dict = Depends(get_current_user)):
    try:
        new_req = EmergencyRequest(
            consumerId=payload["userId"],
            latitude=req.latitude,
            longitude=req.longitude,
            needType=req.needType,
            targetMandiId=req.targetMandiId
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
            "claimedById": new_req.claimedById,
            "targetMandiId": new_req.targetMandiId
        }}
    except Exception as e:
        print(e)
        db.rollback()
        return JSONResponse(status_code=500, content={"error": "Failed to create request"})

@router.get("/api/emergency")
def get_emergencies(db: Session = Depends(get_db)):
    try:
        requests = db.query(EmergencyRequest).options(joinedload(EmergencyRequest.consumer), joinedload(EmergencyRequest.targetMandi)).filter(EmergencyRequest.status == RequestStatus.OPEN).order_by(EmergencyRequest.createdAt.desc()).all()
        
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
                "targetMandiId": r.targetMandiId,
                "targetMandi": {
                    "name": r.targetMandi.name,
                    "district": r.targetMandi.district
                } if r.targetMandi else None,
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

@router.get("/api/emergency/claimed")
def get_claimed_emergencies(db: Session = Depends(get_db), payload: dict = Depends(get_current_ngo)):
    try:
        requests = db.query(EmergencyRequest).options(joinedload(EmergencyRequest.consumer), joinedload(EmergencyRequest.targetMandi)).filter(EmergencyRequest.claimedById == payload["userId"]).order_by(EmergencyRequest.createdAt.desc()).all()
        
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
                "targetMandiId": r.targetMandiId,
                "targetMandi": {
                    "name": r.targetMandi.name,
                    "district": r.targetMandi.district
                } if r.targetMandi else None,
                "consumer": {
                    "name": r.consumer.name,
                    "phone": r.consumer.phone
                } if r.consumer else None
            })
        return {"emergencyRequests": result}
    except Exception as e:
        print(e)
        return JSONResponse(status_code=500, content={"error": "Failed to fetch claimed requests"})

@router.get("/api/emergency/nearby")
def get_nearby_emergencies(lat: float, lng: float, radius: float = 50.0, db: Session = Depends(get_db)):
    """
    Returns geo-clustered emergency requests, available food pledges, and active emergency windows.
    In a real app, we'd use PostGIS (ST_DWithin). Here we just return all for simplicity.
    """
    try:
        from app.models import EmergencyRequest, FoodPledge, EmergencyWindow, RequestStatus, PledgeStatus, WindowStatus
        
        # 1. Emergency Requests
        requests = db.query(EmergencyRequest).filter(EmergencyRequest.status == RequestStatus.OPEN).all()
        # 2. Food Pledges
        pledges = db.query(FoodPledge).filter(FoodPledge.status == PledgeStatus.AVAILABLE).all()
        # 3. Emergency Windows
        windows = db.query(EmergencyWindow).filter(EmergencyWindow.status == WindowStatus.ACTIVE).all()
        
        return {
            "emergencyRequests": [{"id": r.id, "lat": r.latitude, "lng": r.longitude, "needType": r.needType} for r in requests],
            "foodPledges": [{"id": p.id, "kitchenId": p.kitchenId, "capacity": p.capacity} for p in pledges],
            "emergencyWindows": [{"id": w.id, "district": w.district, "reason": w.reason} for w in windows]
        }
    except Exception as e:
        print(e)
        return JSONResponse(status_code=500, content={"error": "Failed to fetch nearby emergencies"})

class KitchenPartnerRegisterReq(BaseModel):
    kitchenName: str
    documentUrl: str

@router.post("/api/emergency/kitchens")
def register_kitchen(req: KitchenPartnerRegisterReq, db: Session = Depends(get_db), payload: dict = Depends(get_current_user)):
    try:
        from app.models import KitchenPartner
        
        existing = db.query(KitchenPartner).filter(KitchenPartner.userId == payload["userId"]).first()
        if existing:
            return JSONResponse(status_code=400, content={"error": "Already registered as a kitchen partner"})
            
        new_kitchen = KitchenPartner(
            userId=payload["userId"],
            kitchenName=req.kitchenName,
            documentUrl=req.documentUrl,
            verificationStatus=False
        )
        db.add(new_kitchen)
        db.commit()
        return {"message": "Kitchen partner registration submitted"}
    except Exception as e:
        print(e)
        db.rollback()
        return JSONResponse(status_code=500, content={"error": "Registration failed"})

class PledgeCreateReq(BaseModel):
    capacity: float

@router.post("/api/emergency/pledges")
def create_pledge(req: PledgeCreateReq, db: Session = Depends(get_db), payload: dict = Depends(get_current_user)):
    try:
        from app.models import KitchenPartner, FoodPledge
        kitchen = db.query(KitchenPartner).filter(KitchenPartner.userId == payload["userId"]).first()
        if not kitchen or not kitchen.verificationStatus:
            return JSONResponse(status_code=403, content={"error": "Kitchen partner not verified"})
            
        pledge = FoodPledge(
            kitchenId=kitchen.id,
            capacity=req.capacity
        )
        db.add(pledge)
        db.commit()
        return {"message": "Pledge created", "pledgeId": pledge.id}
    except Exception as e:
        print(e)
        db.rollback()
        return JSONResponse(status_code=500, content={"error": "Failed to create pledge"})
