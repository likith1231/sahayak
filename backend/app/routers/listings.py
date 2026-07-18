from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from app.database import get_db
from app.models import Listing, ListingStatus
from app.schemas import ListingCreateReq
from app.auth.dependencies import get_current_farmer, get_current_user

router = APIRouter()

@router.post("/api/listings")
def create_listing(req: ListingCreateReq, db: Session = Depends(get_db), payload: dict = Depends(get_current_farmer)):
    try:
        new_listing = Listing(
            farmerId=payload["userId"],
            cropName=req.cropName,
            quantity=req.quantity,
            unit=req.unit,
            price=req.price,
            harvestDate=req.harvestDate,
            photoUrl=req.photoUrl
        )
        db.add(new_listing)
        db.commit()
        db.refresh(new_listing)
        
        return {"listing": {
            "id": new_listing.id,
            "farmerId": new_listing.farmerId,
            "cropName": new_listing.cropName,
            "quantity": new_listing.quantity,
            "unit": new_listing.unit,
            "price": new_listing.price,
            "harvestDate": new_listing.harvestDate.isoformat(),
            "photoUrl": new_listing.photoUrl,
            "status": new_listing.status.value,
            "createdAt": new_listing.createdAt.isoformat()
        }}
    except Exception as e:
        print(e)
        return JSONResponse(status_code=500, content={"error": "Failed to create listing"})

@router.get("/api/listings")
def get_listings(db: Session = Depends(get_db)):
    try:
        listings = db.query(Listing).options(joinedload(Listing.farmer)).filter(Listing.status == ListingStatus.AVAILABLE).order_by(Listing.createdAt.desc()).all()
        
        result = []
        for l in listings:
            result.append({
                "id": l.id,
                "farmerId": l.farmerId,
                "cropName": l.cropName,
                "quantity": l.quantity,
                "unit": l.unit,
                "price": l.price,
                "harvestDate": l.harvestDate.isoformat(),
                "photoUrl": l.photoUrl,
                "status": l.status.value,
                "createdAt": l.createdAt.isoformat(),
                "farmer": {
                    "name": l.farmer.name,
                    "phone": l.farmer.phone
                }
            })
        return {"listings": result}
    except Exception as e:
        print(e)
        return JSONResponse(status_code=500, content={"error": "Failed to fetch listings"})

@router.get("/api/listings/price-suggestion")
def get_price_suggestion(cropName: str, db: Session = Depends(get_db)):
    try:
        result = db.query(
            func.avg(Listing.price).label("avg_price"),
            func.count(Listing.id).label("count")
        ).filter(func.lower(Listing.cropName) == cropName.lower()).first()
        
        avg_price = float(result.avg_price) if result.avg_price is not None else None
        count = result.count if result.count is not None else 0
        
        return {"suggestedPrice": avg_price, "basedOnListings": count}
    except Exception as e:
        print(e)
        return {"suggestedPrice": None, "basedOnListings": 0}

@router.get("/api/listings/{id}")
def get_listing(id: str, db: Session = Depends(get_db)):
    try:
        l = db.query(Listing).options(joinedload(Listing.farmer)).filter(Listing.id == id).first()
        if not l:
            return JSONResponse(status_code=404, content={"error": "Listing not found"})
            
        return {"listing": {
            "id": l.id,
            "farmerId": l.farmerId,
            "cropName": l.cropName,
            "quantity": l.quantity,
            "unit": l.unit,
            "price": l.price,
            "harvestDate": l.harvestDate.isoformat(),
            "photoUrl": l.photoUrl,
            "status": l.status.value,
            "createdAt": l.createdAt.isoformat(),
            "farmer": {
                "name": l.farmer.name,
                "phone": l.farmer.phone
            }
        }}
    except Exception as e:
        print(e)
        return JSONResponse(status_code=500, content={"error": "Failed to fetch listing"})

@router.delete("/api/listings/{id}")
def delete_listing(id: str, db: Session = Depends(get_db), payload: dict = Depends(get_current_user)):
    try:
        listing = db.query(Listing).filter(Listing.id == id).first()
        if not listing or listing.farmerId != payload["userId"]:
            return JSONResponse(status_code=403, content={"error": "Not authorized to delete this listing"})
            
        listing.status = ListingStatus.REMOVED
        db.commit()
        
        return {"message": "Listing removed"}
    except Exception as e:
        print(e)
        return JSONResponse(status_code=500, content={"error": "Failed to delete listing"})
