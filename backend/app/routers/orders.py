from datetime import datetime

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.models import (
    Order, Listing, ListingStatus, OrderStatus, Notification,
    FulfillmentType, FulfillmentStatus, OrderTrackingEvent,
)
from app.schemas import OrderCreateReq, OrderStatusUpdateReq, OrderCancelReq, OrderRateReq
from app.auth.dependencies import get_current_consumer, get_current_user, get_current_farmer
from app.services import delivery
from app.services.payment import refund_razorpay_payment

router = APIRouter()


def _iso(dt):
    # Stored as naive UTC; mark it so browsers convert to local time correctly.
    return dt.isoformat() + "Z" if dt else None


def _fulfillment_type(o: Order) -> FulfillmentType:
    return o.fulfillmentType or FulfillmentType.PICKUP


def _fulfillment_status(o: Order) -> FulfillmentStatus:
    if o.fulfillmentStatus:
        return o.fulfillmentStatus
    # Orders created before tracking existed
    legacy = {
        OrderStatus.CANCELLED: FulfillmentStatus.CANCELLED,
        OrderStatus.DELIVERED: FulfillmentStatus.DELIVERED,
        OrderStatus.CONFIRMED: FulfillmentStatus.CONFIRMED,
    }
    return legacy.get(o.status, FulfillmentStatus.PLACED)


def _payment_label(o: Order) -> str:
    if o.status == OrderStatus.PAID:
        return "Paid online" if o.razorpayPaymentId else "Paid"
    if o.status == OrderStatus.PENDING_PAYMENT_AT_PICKUP:
        return "Pay on delivery" if _fulfillment_type(o) == FulfillmentType.DELIVERY else "Pay at pickup"
    if o.status == OrderStatus.PENDING_PAYMENT:
        return "Awaiting payment"
    if o.status == OrderStatus.CANCELLED:
        return "Cancelled"
    return o.status.value.replace("_", " ").title() if o.status else "Unknown"


def _steps(o: Order) -> list:
    ftype = _fulfillment_type(o)
    current = _fulfillment_status(o)
    flow = delivery.flow_for(ftype)
    reached = {e.status: e.createdAt for e in (o.trackingEvents or [])}
    if current == FulfillmentStatus.CANCELLED:
        # Show progress up to the point of cancellation, then the cancelled step
        done = [s for s in flow if s.value in reached]
        steps = [
            {"status": s.value, "title": delivery.status_title(ftype, s), "completed": True, "current": False, "at": _iso(reached.get(s.value))}
            for s in done
        ]
        steps.append({"status": "CANCELLED", "title": "Cancelled", "completed": True, "current": True, "at": _iso(o.cancelledAt)})
        return steps
    idx = flow.index(current) if current in flow else 0
    return [
        {
            "status": s.value,
            "title": delivery.status_title(ftype, s),
            "completed": i <= idx,
            "current": i == idx,
            "at": _iso(reached.get(s.value)),
        }
        for i, s in enumerate(flow)
    ]


def serialize_order(o: Order, viewer: str, detail: bool = False) -> dict:
    """viewer is 'consumer' or 'farmer' — controls which private fields are exposed."""
    ftype = _fulfillment_type(o)
    fstatus = _fulfillment_status(o)
    nxt = delivery.next_status(ftype, fstatus)
    data = {
        "id": o.id,
        "consumerId": o.consumerId,
        "listingId": o.listingId,
        "quantity": o.quantity,
        "totalPrice": o.totalPrice,
        "deliveryFee": o.deliveryFee or 0.0,
        "status": o.status.value if o.status else None,
        "paymentMethod": o.paymentMethod.value if o.paymentMethod else None,
        "paymentLabel": _payment_label(o),
        "createdAt": _iso(o.createdAt),
        "updatedAt": _iso(o.updatedAt),
        "fulfillmentType": ftype.value,
        "fulfillmentStatus": fstatus.value,
        "fulfillmentLabel": delivery.status_title(ftype, fstatus),
        "trackingNumber": o.trackingNumber,
        "checkoutGroupId": o.checkoutGroupId,
        "estimatedDeliveryAt": _iso(o.estimatedDeliveryAt),
        "deliveredAt": _iso(o.deliveredAt),
        "cancelledAt": _iso(o.cancelledAt),
        "cancelReason": o.cancelReason,
        "refundStatus": o.refundStatus,
        "deliverySlot": o.deliverySlot,
        "deliveryDate": o.deliveryDate.date().isoformat() if o.deliveryDate else None,
        "delivery": {
            "name": o.deliveryName,
            "phone": o.deliveryPhone,
            "address": o.deliveryAddress,
            "city": o.deliveryCity,
            "pincode": o.deliveryPincode,
            "instructions": o.deliveryInstructions,
        } if ftype == FulfillmentType.DELIVERY else None,
        "deliveryPartner": {
            "name": o.deliveryPartnerName,
            "phone": o.deliveryPartnerPhone,
        } if o.deliveryPartnerName else None,
        "pickupCenter": {
            "name": o.pickupCenter.name,
            "address": o.pickupCenter.address,
            "district": o.pickupCenter.district,
        } if o.pickupCenter else None,
        "rating": o.rating,
        "review": o.review,
        "canCancel": viewer == "consumer" and fstatus in delivery.CANCELLABLE,
        "canRate": viewer == "consumer" and fstatus == FulfillmentStatus.DELIVERED and o.rating is None,
        "steps": _steps(o),
    }
    if viewer == "consumer":
        data["listing"] = {
            "cropName": o.listing.cropName,
            "unit": o.listing.unit,
            "price": o.listing.price,
            "farmer": {"name": o.listing.farmer.name, "phone": o.listing.farmer.phone},
        }
        # The consumer shares this code with the farmer/rider at handover.
        if fstatus not in (FulfillmentStatus.DELIVERED, FulfillmentStatus.CANCELLED):
            data["deliveryOtp"] = o.deliveryOtp
    else:
        data["consumer"] = {"name": o.consumer.name, "phone": o.consumer.phone} if o.consumer else None
        data["listing"] = {"cropName": o.listing.cropName, "unit": o.listing.unit, "price": o.listing.price}
        # Farmers can't move an online order forward until it's actually paid.
        awaiting_payment = o.status == OrderStatus.PENDING_PAYMENT
        data["nextStatus"] = None if (awaiting_payment or not nxt) else {
            "status": nxt.value,
            "title": delivery.status_title(ftype, nxt),
            "requiresOtp": nxt == FulfillmentStatus.DELIVERED,
        }
        data["canReject"] = fstatus in (FulfillmentStatus.PLACED, FulfillmentStatus.CONFIRMED)
    if detail:
        data["events"] = [
            {
                "id": e.id,
                "status": e.status,
                "title": e.title,
                "description": e.description,
                "location": e.location,
                "createdAt": _iso(e.createdAt),
            }
            for e in sorted(o.trackingEvents or [], key=lambda e: e.createdAt or datetime.min, reverse=True)
        ]
    return data


def _load_order(db: Session, order_id: str):
    return db.query(Order).options(
        joinedload(Order.listing).joinedload(Listing.farmer),
        joinedload(Order.consumer),
        joinedload(Order.pickupCenter),
        joinedload(Order.trackingEvents),
    ).filter(Order.id == order_id).first()


def _viewer_for(o: Order, payload: dict):
    if payload.get("role") == "CONSUMER" and o.consumerId == payload["userId"]:
        return "consumer"
    if payload.get("role") == "FARMER" and o.listing and o.listing.farmerId == payload["userId"]:
        return "farmer"
    return None


def _restock(db: Session, o: Order):
    listing = db.query(Listing).with_for_update().filter(Listing.id == o.listingId).first()
    if not listing:
        return
    listing.quantity = (listing.quantity or 0) + o.quantity
    if listing.status == ListingStatus.SOLD_OUT and listing.quantity > 0:
        listing.status = ListingStatus.AVAILABLE


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
            totalPrice=listing.price * req.quantity,
            fulfillmentType=FulfillmentType.PICKUP,
            fulfillmentStatus=FulfillmentStatus.PLACED,
            trackingNumber=delivery.generate_tracking_number(),
            deliveryOtp=delivery.generate_otp(),
            pickupCenterId=listing.distributionCenterId,
        )
        db.add(new_order)
        delivery.add_event(new_order, FulfillmentStatus.PLACED)
        db.commit()
        db.refresh(new_order)

        return {"order": {
            "id": new_order.id,
            "consumerId": new_order.consumerId,
            "listingId": new_order.listingId,
            "quantity": new_order.quantity,
            "totalPrice": new_order.totalPrice,
            "status": new_order.status.value,
            "trackingNumber": new_order.trackingNumber,
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
            joinedload(Order.listing).joinedload(Listing.farmer),
            joinedload(Order.pickupCenter),
            joinedload(Order.trackingEvents),
        ).filter(Order.consumerId == payload["userId"]).order_by(Order.createdAt.desc()).all()

        return {"orders": [serialize_order(o, "consumer") for o in orders]}
    except Exception as e:
        print(e)
        return JSONResponse(status_code=500, content={"error": "Failed to fetch orders"})

@router.get("/api/orders/farmer")
def get_farmer_orders(db: Session = Depends(get_db), payload: dict = Depends(get_current_farmer)):
    try:
        orders = db.query(Order).options(
            joinedload(Order.listing).joinedload(Listing.farmer),
            joinedload(Order.consumer),
            joinedload(Order.pickupCenter),
            joinedload(Order.trackingEvents),
        ).join(Listing).filter(Listing.farmerId == payload["userId"]).order_by(Order.createdAt.desc()).all()

        return {"orders": [serialize_order(o, "farmer") for o in orders]}
    except Exception as e:
        print(e)
        return JSONResponse(status_code=500, content={"error": "Failed to fetch farmer orders"})


@router.get("/api/orders/{order_id}")
def get_order(order_id: str, db: Session = Depends(get_db), payload: dict = Depends(get_current_user)):
    o = _load_order(db, order_id)
    viewer = _viewer_for(o, payload) if o else None
    if not viewer:
        return JSONResponse(status_code=404, content={"error": "Order not found"})
    return {"order": serialize_order(o, viewer, detail=True)}


@router.patch("/api/orders/{order_id}/status")
def update_order_status(order_id: str, req: OrderStatusUpdateReq, db: Session = Depends(get_db), payload: dict = Depends(get_current_farmer)):
    """Farmer advances an order along its delivery/pickup flow."""
    o = _load_order(db, order_id)
    if not o or _viewer_for(o, payload) != "farmer":
        return JSONResponse(status_code=404, content={"error": "Order not found"})

    try:
        target = FulfillmentStatus(req.status)
    except ValueError:
        return JSONResponse(status_code=400, content={"error": "Invalid status"})

    current = _fulfillment_status(o)
    if current in (FulfillmentStatus.DELIVERED, FulfillmentStatus.CANCELLED):
        return JSONResponse(status_code=409, content={"error": f"Order is already {current.value.lower()}"})
    if o.status == OrderStatus.PENDING_PAYMENT:
        return JSONResponse(status_code=409, content={"error": "Waiting for the buyer's online payment to complete"})

    expected = delivery.next_status(_fulfillment_type(o), current)
    if target != expected:
        return JSONResponse(status_code=400, content={"error": f"Next step for this order is {expected.value if expected else 'none'}"})

    if target == FulfillmentStatus.DELIVERED:
        if not req.otp or req.otp.strip() != (o.deliveryOtp or ""):
            return JSONResponse(status_code=400, content={"error": "Incorrect handover code. Ask the buyer for the 4-digit code shown on their order."})

    if target == FulfillmentStatus.OUT_FOR_DELIVERY:
        if req.deliveryPartnerName:
            o.deliveryPartnerName = req.deliveryPartnerName.strip()
        if req.deliveryPartnerPhone:
            o.deliveryPartnerPhone = req.deliveryPartnerPhone.strip()

    o.fulfillmentStatus = target
    description = req.note.strip() if req.note and req.note.strip() else None
    if target == FulfillmentStatus.OUT_FOR_DELIVERY and o.deliveryPartnerName and not description:
        description = f"{o.deliveryPartnerName} is delivering your order" + (f" ({o.deliveryPartnerPhone})." if o.deliveryPartnerPhone else ".")
    delivery.add_event(o, target, description=description, location=(req.location or "").strip() or None)

    if target == FulfillmentStatus.DELIVERED:
        o.deliveredAt = datetime.utcnow()
        if o.status == OrderStatus.PENDING_PAYMENT_AT_PICKUP:
            o.status = OrderStatus.PAID
            o.trackingEvents.append(OrderTrackingEvent(
                status="PAYMENT_CONFIRMED", title="Cash collected",
                description=f"₹{o.totalPrice + (o.deliveryFee or 0):.2f} collected at handover.",
            ))

    title = delivery.status_title(_fulfillment_type(o), target)
    db.add(Notification(
        userId=o.consumerId,
        message=f"{o.listing.cropName} (#{o.trackingNumber}): {title}." + (f" {description}" if description else ""),
        isRead=False,
    ))
    db.commit()
    db.refresh(o)
    return {"order": serialize_order(_load_order(db, order_id), "farmer", detail=True)}


@router.post("/api/orders/{order_id}/cancel")
def cancel_order(order_id: str, req: OrderCancelReq, db: Session = Depends(get_db), payload: dict = Depends(get_current_user)):
    """Consumers can cancel before dispatch; farmers can reject before packing."""
    o = _load_order(db, order_id)
    viewer = _viewer_for(o, payload) if o else None
    if not viewer:
        return JSONResponse(status_code=404, content={"error": "Order not found"})

    current = _fulfillment_status(o)
    allowed = delivery.CANCELLABLE if viewer == "consumer" else {FulfillmentStatus.PLACED, FulfillmentStatus.CONFIRMED}
    if current not in allowed:
        msg = "This order can no longer be cancelled" if viewer == "consumer" else "Orders can only be rejected before they are packed"
        return JSONResponse(status_code=409, content={"error": msg})

    reason = (req.reason or "").strip() or None
    was_paid = o.status == OrderStatus.PAID
    _restock(db, o)
    o.fulfillmentStatus = FulfillmentStatus.CANCELLED
    o.status = OrderStatus.CANCELLED
    o.cancelledAt = datetime.utcnow()
    o.cancelReason = reason

    who = "You" if viewer == "consumer" else "The farmer"
    delivery.add_event(o, FulfillmentStatus.CANCELLED, description=f"{who} cancelled this order" + (f": {reason}" if reason else "."))

    if was_paid:
        refund_amount = o.totalPrice + (o.deliveryFee or 0)
        if refund_razorpay_payment(o.razorpayPaymentId, refund_amount):
            o.refundStatus = "INITIATED"
            refund_desc = f"Refund of ₹{refund_amount:.2f} initiated. It reaches your account in 5–7 business days."
        else:
            o.refundStatus = "PENDING"
            refund_desc = f"Refund of ₹{refund_amount:.2f} will be processed by our team."
        o.trackingEvents.append(OrderTrackingEvent(status="REFUND", title="Refund", description=refund_desc))

    # Tell the other party
    if viewer == "consumer":
        db.add(Notification(
            userId=o.listing.farmerId,
            message=f"Order #{o.trackingNumber} for {o.listing.cropName} was cancelled by the buyer." + (f" Reason: {reason}" if reason else ""),
            isRead=False,
        ))
    else:
        db.add(Notification(
            userId=o.consumerId,
            message=f"Your order #{o.trackingNumber} for {o.listing.cropName} was cancelled by the farmer." + (f" Reason: {reason}" if reason else ""),
            isRead=False,
        ))

    db.commit()
    return {"order": serialize_order(_load_order(db, order_id), viewer, detail=True)}


@router.post("/api/orders/{order_id}/rate")
def rate_order(order_id: str, req: OrderRateReq, db: Session = Depends(get_db), payload: dict = Depends(get_current_consumer)):
    o = _load_order(db, order_id)
    if not o or _viewer_for(o, payload) != "consumer":
        return JSONResponse(status_code=404, content={"error": "Order not found"})
    if _fulfillment_status(o) != FulfillmentStatus.DELIVERED:
        return JSONResponse(status_code=409, content={"error": "You can rate an order once it has been delivered"})
    if not 1 <= req.rating <= 5:
        return JSONResponse(status_code=400, content={"error": "Rating must be between 1 and 5"})
    o.rating = req.rating
    o.review = (req.review or "").strip() or None
    db.add(Notification(
        userId=o.listing.farmerId,
        message=f"{o.consumer.name if o.consumer else 'A buyer'} rated their {o.listing.cropName} order {req.rating}★.",
        isRead=False,
    ))
    db.commit()
    return {"order": serialize_order(_load_order(db, order_id), "consumer", detail=True)}
