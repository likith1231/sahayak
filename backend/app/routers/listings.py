from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from app.database import get_db
from app.models import Listing, ListingStatus, User
from app.schemas import ListingCreateReq, ListingUpdateReq
from app.auth.dependencies import get_current_farmer, get_current_user

CROP_RULES = {
    "Tomatoes": {"units": ["kg", "quintal"], "min_price": 10, "max_price": 60},
    "Potatoes": {"units": ["kg", "quintal"], "min_price": 15, "max_price": 50},
    "Onions": {"units": ["kg", "quintal"], "min_price": 20, "max_price": 80},
    "Carrots": {"units": ["kg", "quintal"], "min_price": 30, "max_price": 70},
    "Spinach": {"units": ["bunch", "kg"], "min_price": 5, "max_price": 30},
    "Cabbage": {"units": ["kg", "piece"], "min_price": 10, "max_price": 40},
    "Cauliflower": {"units": ["kg", "piece"], "min_price": 15, "max_price": 50},
    "Peas": {"units": ["kg"], "min_price": 40, "max_price": 120},
    "Mangoes": {"units": ["kg", "dozen", "box"], "min_price": 50, "max_price": 300},
    "Apples": {"units": ["kg", "box"], "min_price": 80, "max_price": 250},
    "Bananas": {"units": ["dozen", "kg"], "min_price": 20, "max_price": 80},
    "Grapes": {"units": ["kg"], "min_price": 40, "max_price": 150},
    "Oranges": {"units": ["kg", "dozen"], "min_price": 30, "max_price": 100},
    "Rice": {"units": ["kg", "quintal"], "min_price": 40, "max_price": 100},
    "Wheat": {"units": ["kg", "quintal"], "min_price": 30, "max_price": 80},
    "Corn": {"units": ["kg", "quintal"], "min_price": 15, "max_price": 40},
    "Garlic": {"units": ["kg"], "min_price": 100, "max_price": 300},
    "Ginger": {"units": ["kg"], "min_price": 80, "max_price": 250},
    "Turmeric": {"units": ["kg"], "min_price": 100, "max_price": 300},
    "Sugarcane": {"units": ["ton"], "min_price": 2000, "max_price": 4000},
    "Milk": {"units": ["liters"], "min_price": 40, "max_price": 80},
    "Eggs": {"units": ["dozen", "tray"], "min_price": 60, "max_price": 200},
    "Curd": {"units": ["kg", "liters"], "min_price": 50, "max_price": 100},
    "Paneer": {"units": ["kg"], "min_price": 300, "max_price": 500},
    "Ghee": {"units": ["kg", "liters"], "min_price": 500, "max_price": 1000},
    "Butter": {"units": ["kg"], "min_price": 400, "max_price": 800},
}

router = APIRouter()

@router.post("/api/listings")
def create_listing(req: ListingCreateReq, db: Session = Depends(get_db), payload: dict = Depends(get_current_farmer)):
    try:
        # Validate based on CROP_RULES if the crop is known
        if req.cropName in CROP_RULES:
            rules = CROP_RULES[req.cropName]
            if req.unit not in rules["units"]:
                return JSONResponse(status_code=400, content={"error": f"Invalid unit for {req.cropName}. Allowed: {', '.join(rules['units'])}"})
            if req.price < rules["min_price"] or req.price > rules["max_price"]:
                return JSONResponse(status_code=400, content={"error": f"Price for {req.cropName} must be between ₹{rules['min_price']} and ₹{rules['max_price']}/{req.unit}"})
        farmer_user = db.query(User).filter(User.id == payload["userId"]).first()
        listing_location = req.location or (farmer_user.location if farmer_user else "")

        # Find matching DistributionCenter
        distribution_center_id = None
        if listing_location:
            from app.models import DistributionCenter
            dcs = db.query(DistributionCenter).all()
            for dc in dcs:
                if dc.district.lower() in listing_location.lower():
                    distribution_center_id = dc.id
                    break
        if not distribution_center_id:
            from app.models import DistributionCenter
            first_dc = db.query(DistributionCenter).first()
            if first_dc:
                distribution_center_id = first_dc.id

        new_listing = Listing(
            farmerId=payload["userId"],
            cropName=req.cropName,
            quantity=req.quantity,
            unit=req.unit,
            price=req.price,
            harvestDate=req.harvestDate,
            location=listing_location,
            category=req.category,
            distributionCenterId=distribution_center_id
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
            "location": new_listing.location,
            "category": new_listing.category.value if new_listing.category else None,
            "status": new_listing.status.value,
            "createdAt": new_listing.createdAt.isoformat()
        }}
    except Exception as e:
        print(e)
        return JSONResponse(status_code=500, content={"error": "Failed to create listing"})

@router.get("/api/listings")
def get_listings(category: str = None, distribution_center_id: str = None, db: Session = Depends(get_db)):
    try:
        query = db.query(Listing).options(
            joinedload(Listing.farmer),
            joinedload(Listing.distributionCenter)
        ).filter(Listing.status == ListingStatus.AVAILABLE)
        
        if category:
            query = query.filter(Listing.category == category)
            
        if distribution_center_id:
            query = query.filter(Listing.distributionCenterId == distribution_center_id)
            
        listings = query.order_by(Listing.createdAt.desc()).limit(50).all()
        
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
                "location": l.location,
                "category": l.category.value if l.category else None,
                "status": l.status.value,
                "createdAt": l.createdAt.isoformat(),
                "farmer": {
                    "name": l.farmer.name,
                    "phone": l.farmer.phone
                },
                "distributionCenter": {
                    "id": l.distributionCenter.id,
                    "name": l.distributionCenter.name,
                    "district": l.distributionCenter.district,
                    "address": l.distributionCenter.address
                } if l.distributionCenter else None
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

@router.get("/api/listings/me")
def get_my_listings(db: Session = Depends(get_db), payload: dict = Depends(get_current_farmer)):
    try:
        listings = db.query(Listing).options(
            joinedload(Listing.farmer),
            joinedload(Listing.distributionCenter)
        ).filter(Listing.farmerId == payload["userId"]).order_by(Listing.createdAt.desc()).all()
        
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
                "location": l.location,
                "category": l.category.value if l.category else None,
                "status": l.status.value,
                "createdAt": l.createdAt.isoformat(),
                "farmer": {
                    "name": l.farmer.name,
                    "phone": l.farmer.phone
                },
                "distributionCenter": {
                    "id": l.distributionCenter.id,
                    "name": l.distributionCenter.name,
                    "district": l.distributionCenter.district,
                    "address": l.distributionCenter.address
                } if l.distributionCenter else None
            })
        return {"listings": result}
    except Exception as e:
        print(e)
        return JSONResponse(status_code=500, content={"error": "Failed to fetch listings"})

@router.patch("/api/listings/{id}")
def update_listing(id: str, req: ListingUpdateReq, db: Session = Depends(get_db), payload: dict = Depends(get_current_farmer)):
    try:
        listing = db.query(Listing).filter(Listing.id == id).first()
        if not listing or listing.farmerId != payload["userId"]:
            return JSONResponse(status_code=403, content={"error": "Not authorized to edit this listing"})
            
        if req.quantity is not None:
            listing.quantity = req.quantity
            if listing.quantity > 0 and listing.status == ListingStatus.SOLD_OUT:
                listing.status = ListingStatus.AVAILABLE
            elif listing.quantity == 0 and listing.status == ListingStatus.AVAILABLE:
                listing.status = ListingStatus.SOLD_OUT
                
        if req.price is not None:
            if listing.cropName in CROP_RULES:
                rules = CROP_RULES[listing.cropName]
                if req.price < rules["min_price"] or req.price > rules["max_price"]:
                    return JSONResponse(status_code=400, content={"error": f"Price for {listing.cropName} must be between ₹{rules['min_price']} and ₹{rules['max_price']}/{listing.unit}"})
            listing.price = req.price
            
        db.commit()
        db.refresh(listing)
        
        return {"message": "Listing updated"}
    except Exception as e:
        print(e)
        return JSONResponse(status_code=500, content={"error": "Failed to update listing"})

@router.get("/api/listings/{id}")
def get_listing(id: str, db: Session = Depends(get_db)):
    try:
        l = db.query(Listing).options(
            joinedload(Listing.farmer),
            joinedload(Listing.distributionCenter)
        ).filter(Listing.id == id).first()
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
            "location": l.location,
            "category": l.category.value if l.category else None,
            "status": l.status.value,
            "createdAt": l.createdAt.isoformat(),
            "farmer": {
                "name": l.farmer.name,
                "phone": l.farmer.phone
            },
            "distributionCenter": {
                "id": l.distributionCenter.id,
                "name": l.distributionCenter.name,
                "district": l.distributionCenter.district,
                "address": l.distributionCenter.address
            } if l.distributionCenter else None
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
