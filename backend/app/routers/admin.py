from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.models import NGO, KitchenPartner, Order, EmergencyRequest, Listing
from sqlalchemy import func
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

@router.patch("/api/admin/kitchens/{id}/verify")
def verify_kitchen(id: str, db: Session = Depends(get_db), payload: dict = Depends(get_current_admin)):
    try:
        kitchen = db.query(KitchenPartner).filter(KitchenPartner.id == id).first()
        if not kitchen:
            return JSONResponse(status_code=404, content={"error": "Kitchen partner not found"})
            
        kitchen.verificationStatus = True
        db.commit()
        return {"message": "Kitchen partner verified successfully"}
    except Exception as e:
        print(e)
        db.rollback()
        return JSONResponse(status_code=500, content={"error": "Failed to verify kitchen partner"})

@router.get("/api/admin/analytics")
def get_analytics(db: Session = Depends(get_db), payload: dict = Depends(get_current_admin)):
    try:
        total_orders = db.query(func.count(Order.id)).scalar()
        total_sales = db.query(func.sum(Order.totalPrice)).scalar() or 0.0
        active_emergencies = db.query(func.count(EmergencyRequest.id)).filter(EmergencyRequest.status == "OPEN").scalar()
        pending_ngos = db.query(func.count(NGO.id)).filter(NGO.verificationStatus == False).scalar()
        total_listings = db.query(func.count(Listing.id)).scalar()
        
        return {
            "totalOrders": total_orders,
            "totalSales": total_sales,
            "activeEmergencies": active_emergencies,
            "pendingNgos": pending_ngos,
            "totalListings": total_listings
        }
    except Exception as e:
        print(e)
        return JSONResponse(status_code=500, content={"error": "Failed to fetch analytics"})
