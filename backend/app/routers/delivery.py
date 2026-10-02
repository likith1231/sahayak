from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Address
from app.schemas import AddressCreateReq, AddressUpdateReq
from app.auth.dependencies import get_current_user
from app.services import delivery

router = APIRouter(tags=["Delivery"])


def serialize_address(a: Address) -> dict:
    return {
        "id": a.id,
        "label": a.label,
        "name": a.name,
        "phone": a.phone,
        "line1": a.line1,
        "line2": a.line2,
        "landmark": a.landmark,
        "city": a.city,
        "pincode": a.pincode,
        "isDefault": bool(a.isDefault),
    }


@router.get("/api/delivery/serviceability")
def check_serviceability(pincode: str):
    """Can we deliver to this pincode, and how soon?"""
    if not delivery.is_serviceable(pincode):
        return {
            "pincode": pincode,
            "serviceable": False,
            "message": "Home delivery isn't available here yet. You can still pick up from a distribution center.",
        }
    days = delivery.available_slots(pincode)
    first = days[0] if days else None
    first_slot = next((s for s in first["slots"] if s["available"]), None) if first else None
    return {
        "pincode": pincode,
        "serviceable": True,
        "earliest": f"{first['label']}, {first_slot['window']}" if first_slot else None,
        "deliveryFee": delivery.DELIVERY_FEE,
        "freeDeliveryThreshold": delivery.FREE_DELIVERY_THRESHOLD,
    }


@router.get("/api/delivery/slots")
def get_delivery_slots(pincode: str = None):
    return {
        "days": delivery.available_slots(pincode),
        "deliveryFee": delivery.DELIVERY_FEE,
        "freeDeliveryThreshold": delivery.FREE_DELIVERY_THRESHOLD,
    }


@router.get("/api/addresses")
def list_addresses(db: Session = Depends(get_db), payload: dict = Depends(get_current_user)):
    addresses = db.query(Address).filter(Address.userId == payload["userId"]).order_by(Address.isDefault.desc(), Address.createdAt.desc()).all()
    return {"addresses": [serialize_address(a) for a in addresses]}


def _validate_fields(name, phone, line1, city, pincode):
    if not all(v and str(v).strip() for v in (name, phone, line1, city, pincode)):
        raise HTTPException(status_code=400, detail="Name, phone, address, city and pincode are required")
    if not (len(pincode) == 6 and pincode.isdigit()):
        raise HTTPException(status_code=400, detail="Pincode must be 6 digits")
    digits = "".join(c for c in phone if c.isdigit())
    if len(digits) < 10:
        raise HTTPException(status_code=400, detail="Enter a valid 10-digit phone number")


def _clear_default(db: Session, user_id: str):
    db.query(Address).filter(Address.userId == user_id, Address.isDefault == True).update({"isDefault": False})


@router.post("/api/addresses", status_code=status.HTTP_201_CREATED)
def create_address(req: AddressCreateReq, db: Session = Depends(get_db), payload: dict = Depends(get_current_user)):
    _validate_fields(req.name, req.phone, req.line1, req.city, req.pincode)
    user_id = payload["userId"]
    has_any = db.query(Address).filter(Address.userId == user_id).first() is not None
    make_default = bool(req.isDefault) or not has_any
    if make_default:
        _clear_default(db, user_id)
    address = Address(
        userId=user_id,
        label=(req.label or "Home").strip(),
        name=req.name.strip(),
        phone=req.phone.strip(),
        line1=req.line1.strip(),
        line2=req.line2,
        landmark=req.landmark,
        city=req.city.strip(),
        pincode=req.pincode.strip(),
        isDefault=make_default,
    )
    db.add(address)
    db.commit()
    db.refresh(address)
    return {"address": serialize_address(address)}


@router.put("/api/addresses/{address_id}")
def update_address(address_id: str, req: AddressUpdateReq, db: Session = Depends(get_db), payload: dict = Depends(get_current_user)):
    address = db.query(Address).filter(Address.id == address_id, Address.userId == payload["userId"]).first()
    if not address:
        raise HTTPException(status_code=404, detail="Address not found")
    data = req.model_dump(exclude_unset=True)
    for field, value in data.items():
        if field == "isDefault":
            continue
        setattr(address, field, value.strip() if isinstance(value, str) else value)
    _validate_fields(address.name, address.phone, address.line1, address.city, address.pincode)
    if data.get("isDefault"):
        _clear_default(db, payload["userId"])
        address.isDefault = True
    db.commit()
    db.refresh(address)
    return {"address": serialize_address(address)}


@router.delete("/api/addresses/{address_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_address(address_id: str, db: Session = Depends(get_db), payload: dict = Depends(get_current_user)):
    address = db.query(Address).filter(Address.id == address_id, Address.userId == payload["userId"]).first()
    if not address:
        raise HTTPException(status_code=404, detail="Address not found")
    was_default = address.isDefault
    db.delete(address)
    db.flush()
    if was_default:
        replacement = db.query(Address).filter(Address.userId == payload["userId"]).order_by(Address.createdAt.desc()).first()
        if replacement:
            replacement.isDefault = True
    db.commit()
    return None
