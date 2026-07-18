from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.models import Order, Listing, ListingStatus
from app.schemas import OrderCreateReq
from app.auth.dependencies import get_current_consumer, get_current_user

router = APIRouter()

@router.post("/api/orders")
def create_order(req: OrderCreateReq, db: Session = Depends(get_db), payload: dict = Depends(get_current_consumer)):
    if req.quantity <= 0:
        return JSONResponse(status_code=400, content={"error": "Missing or invalid fields"})
        
    try:
        # Atomic lock
        listing = db.query(Listing).with_for_update().filter(Listing.id == req.listingId).first()
        
        if not listing:
            db.rollback()
            return JSONResponse(status_code=404, content={"error": "Listing not found"})
            
        if listing.status != ListingStatus.AVAILABLE:
            db.rollback()
            return JSONResponse(status_code=409, content={"error": "Listing is no longer available"})
            
        if listing.quantity < req.quantity:
            db.rollback()
            return JSONResponse(status_code=409, content={"error": "Not enough quantity available"})
            
        remaining = listing.quantity - req.quantity
        listing.quantity = remaining
        if remaining == 0:
            listing.status = ListingStatus.SOLD_OUT
            
        new_order = Order(
            consumerId=payload["userId"],
            listingId=req.listingId,
            quantity=req.quantity,
            totalPrice=listing.price * req.quantity
        )
        db.add(new_order)
        db.commit()
        db.refresh(new_order)
        
        return {"order": {
            "id": new_order.id,
            "consumerId": new_order.consumerId,
            "listingId": new_order.listingId,
            "quantity": new_order.quantity,
            "totalPrice": new_order.totalPrice,
            "status": new_order.status.value,
            "createdAt": new_order.createdAt.isoformat()
        }}
    except Exception as e:
        print(e)
        db.rollback()
        return JSONResponse(status_code=500, content={"error": "Failed to place order"})

@router.get("/api/orders")
def get_orders(db: Session = Depends(get_db), payload: dict = Depends(get_current_user)):
    try:
        orders = db.query(Order).options(
            joinedload(Order.listing).joinedload(Listing.farmer)
        ).filter(Order.consumerId == payload["userId"]).order_by(Order.createdAt.desc()).all()
        
        result = []
        for o in orders:
            result.append({
                "id": o.id,
                "consumerId": o.consumerId,
                "listingId": o.listingId,
                "quantity": o.quantity,
                "totalPrice": o.totalPrice,
                "status": o.status.value,
                "createdAt": o.createdAt.isoformat(),
                "listing": {
                    "cropName": o.listing.cropName,
                    "unit": o.listing.unit,
                    "farmer": {
                        "name": o.listing.farmer.name,
                        "phone": o.listing.farmer.phone
                    }
                }
            })
        return {"orders": result}
    except Exception as e:
        print(e)
        return JSONResponse(status_code=500, content={"error": "Failed to fetch orders"})
