from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List, Dict, Any

from app.database import get_db
import uuid
from datetime import datetime, timedelta

from app.models import Cart, CartItem, Listing, Order, User, ListingStatus, OrderStatus, Notification, PaymentMethod
from app.models import Address, FulfillmentType, FulfillmentStatus, OrderTrackingEvent
from app.schemas import RazorpayVerifyReq, CheckoutReq
from app.auth.dependencies import get_current_consumer
from app.services.payment import create_razorpay_order, verify_razorpay_signature
from app.services.email import send_order_confirmation
from app.services import delivery
from app.models import DistributionCenter

router = APIRouter(prefix="/api/checkout", tags=["Checkout"])

@router.get("/distribution-centers")
def get_distribution_centers(db: Session = Depends(get_db)):
    """Fetch all available distribution centers."""
    dcs = db.query(DistributionCenter).all()
    return {"distributionCenters": [
        {
            "id": dc.id,
            "name": dc.name,
            "district": dc.district,
            "address": dc.address
        }
        for dc in dcs
    ]}

def _resolve_delivery_address(req: CheckoutReq, db: Session, user_id: str) -> dict:
    if req.addressId:
        address = db.query(Address).filter(Address.id == req.addressId, Address.userId == user_id).first()
        if not address:
            raise ValueError("Delivery address not found")
        data = {
            "name": address.name, "phone": address.phone, "line1": address.line1, "line2": address.line2,
            "landmark": address.landmark, "city": address.city, "pincode": address.pincode,
        }
    elif req.address:
        data = req.address.model_dump()
    else:
        raise ValueError("Please choose a delivery address")

    if not all((data.get(k) or "").strip() for k in ("name", "phone", "line1", "city", "pincode")):
        raise ValueError("Delivery address is incomplete")
    if not delivery.is_serviceable(data["pincode"].strip()):
        raise ValueError(f"Home delivery is not available for pincode {data['pincode']}. Choose pickup instead.")
    return data


def _format_address(data: dict) -> str:
    parts = [data.get("line1"), data.get("line2"), data.get("landmark") and f"Near {data['landmark']}"]
    return ", ".join(p.strip() for p in parts if p and p.strip())


@router.post("")
def checkout(req: CheckoutReq, db: Session = Depends(get_db), current_user: dict = Depends(get_current_consumer)):
    """Checkout all items in the user's cart."""
    user_id = current_user.get("userId")
    cart = db.query(Cart).filter(Cart.consumerId == user_id).first()
    if not cart or not cart.items:
        raise HTTPException(status_code=400, detail="Cart is empty")

    is_cash = req.paymentMethod in ("CASH_ON_PICKUP", "CASH_ON_DELIVERY")
    payment_method = PaymentMethod.CASH_ON_PICKUP if is_cash else req.paymentMethod
    try:
        fulfillment_type = FulfillmentType(req.fulfillmentType or "PICKUP")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid fulfillment type")

    total_amount = 0.0
    created_orders = []
    pickup_details = {} # { dc_id: { "dc": {}, "items": [] } }
    checkout_group_id = str(uuid.uuid4())

    # Start atomic transaction
    try:
        delivery_info = None
        if fulfillment_type == FulfillmentType.DELIVERY:
            address = _resolve_delivery_address(req, db, user_id)
            if not req.deliveryDate or not req.deliverySlot:
                raise ValueError("Please choose a delivery slot")
            eta = delivery.validate_slot(req.deliveryDate, req.deliverySlot, address["pincode"].strip())
            if not eta:
                raise ValueError("That delivery slot is no longer available. Please pick another.")
            slot = delivery.SLOT_BY_ID[req.deliverySlot]
            delivery_info = {
                "deliveryName": address["name"].strip(),
                "deliveryPhone": address["phone"].strip(),
                "deliveryAddress": _format_address(address),
                "deliveryCity": address["city"].strip(),
                "deliveryPincode": address["pincode"].strip(),
                "deliveryInstructions": (req.deliveryInstructions or "").strip() or None,
                "deliveryDate": datetime.fromisoformat(req.deliveryDate),
                "deliverySlot": f"{slot['label']} ({slot['window']})",
                "estimatedDeliveryAt": eta,
            }
        else:
            delivery_info = {"estimatedDeliveryAt": datetime.utcnow() + timedelta(hours=delivery.PICKUP_READY_HOURS)}

        # Sort items to avoid deadlocks
        items = sorted(cart.items, key=lambda x: x.listingId)
        
        for item in items:
            # Lock the listing row for update
            listing = db.query(Listing).with_for_update().filter(Listing.id == item.listingId).first()
            
            if not listing or listing.status != ListingStatus.AVAILABLE:
                raise ValueError(f"Listing {item.listingId} is no longer available")
                
            if listing.quantity < item.quantity:
                raise ValueError(f"Not enough quantity available for {listing.cropName}")
                
            # Decrement listing quantity
            listing.quantity -= item.quantity
            if listing.quantity == 0:
                listing.status = ListingStatus.SOLD_OUT
                
            # Calculate price
            item_total = item.quantity * listing.price
            total_amount += item_total
            
            # Create Order (PENDING_PAYMENT or PENDING_PAYMENT_AT_PICKUP)
            order_status = OrderStatus.PENDING_PAYMENT_AT_PICKUP if is_cash else OrderStatus.PENDING_PAYMENT
            order = Order(
                consumerId=user_id,
                listingId=listing.id,
                quantity=item.quantity,
                totalPrice=item_total,
                status=order_status,
                paymentMethod=payment_method,
                pickupCenterId=listing.distributionCenterId,
                fulfillmentType=fulfillment_type,
                fulfillmentStatus=FulfillmentStatus.PLACED,
                trackingNumber=delivery.generate_tracking_number(),
                checkoutGroupId=checkout_group_id,
                deliveryOtp=delivery.generate_otp(),
                deliveryFee=0.0,
                **delivery_info,
            )
            db.add(order)
            delivery.add_event(
                order,
                FulfillmentStatus.PLACED,
                description=None if is_cash else "Order created. Waiting for payment confirmation.",
            )
            created_orders.append(order)
            
            # Group by Distribution Center
            dc_id = listing.distributionCenterId
            if dc_id:
                if dc_id not in pickup_details:
                    dc = db.query(DistributionCenter).filter(DistributionCenter.id == dc_id).first()
                    pickup_details[dc_id] = {
                        "dc": {
                            "name": dc.name if dc else "Unknown Location",
                            "address": dc.address if dc else "Unknown Address"
                        },
                        "items": []
                    }
                
                farmer = db.query(User).filter(User.id == listing.farmerId).first()
                pickup_details[dc_id]["items"].append({
                    "cropName": listing.cropName,
                    "quantity": f"{item.quantity} {listing.unit}",
                    "farmer": {
                        "name": farmer.name if farmer else "Unknown",
                        "phone": farmer.phone if farmer else "N/A"
                    }
                })

        # One delivery fee per checkout, charged on the first order of the group
        fee = delivery.delivery_fee(total_amount) if fulfillment_type == FulfillmentType.DELIVERY else 0.0
        if created_orders:
            created_orders[0].deliveryFee = fee
        grand_total = total_amount + fee
        
        # We need the order IDs to store in Razorpay order if possible, 
        # but db.flush() gets the IDs.
        db.flush()

        summary = {
            "orders_count": len(created_orders),
            "subtotal": total_amount,
            "delivery_fee": fee,
            "total_amount": grand_total,
            "fulfillment_type": fulfillment_type.value,
            "checkout_group_id": checkout_group_id,
            "orders": [
                {"id": o.id, "trackingNumber": o.trackingNumber, "listingId": o.listingId}
                for o in created_orders
            ],
            "delivery": {
                "name": delivery_info.get("deliveryName"),
                "address": delivery_info.get("deliveryAddress"),
                "city": delivery_info.get("deliveryCity"),
                "pincode": delivery_info.get("deliveryPincode"),
                "slot": delivery_info.get("deliverySlot"),
                "date": req.deliveryDate,
                "estimatedDeliveryAt": delivery_info["estimatedDeliveryAt"].isoformat() + "Z",
            } if fulfillment_type == FulfillmentType.DELIVERY else None,
            "pickup_details": list(pickup_details.values()),
        }
        
        # If paying cash at handover, we don't need Razorpay
        if is_cash:
            for order in created_orders:
                _notify_farmer(db, order, "New cash order")
            
            # Clear the cart
            for item in cart.items:
                db.delete(item)
                
            db.commit()
            
            # Send confirmation email
            order_details = {
                "total_amount": grand_total,
                "pickup_details": list(pickup_details.values()),
                "delivery": summary["delivery"],
                "tracking_numbers": [o.trackingNumber for o in created_orders],
            }
            send_order_confirmation(current_user.get("phone", "") + "@example.com", order_details)
            
            return {
                "message": "Checkout complete (pay in cash on handover)",
                "razorpay_order": None,
                **summary,
            }

        # Create Razorpay Order
        receipt_id = f"rcpt_{user_id[:8]}"
        rzp_order = create_razorpay_order(amount=grand_total, receipt=receipt_id)
        razorpay_order_id = rzp_order.get("id")
        
        # Link Razorpay Order ID to all created orders
        for order in created_orders:
            order.razorpayOrderId = razorpay_order_id
            
        # Do not clear the cart yet for Razorpay, it will be cleared upon verification
        db.commit()
        
        return {
            "message": "Checkout initiated",
            "razorpay_order": rzp_order,
            **summary,
        }
        
    except ValueError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        print(e)
        db.rollback()
        raise HTTPException(status_code=500, detail="Checkout failed due to an internal error")


def _notify_farmer(db: Session, order: Order, prefix: str):
    listing = db.query(Listing).filter(Listing.id == order.listingId).first()
    if not listing:
        return
    if order.fulfillmentType == FulfillmentType.DELIVERY:
        how = f"Home delivery to {order.deliveryCity} ({order.deliveryPincode}), {order.deliverySlot} on {order.deliveryDate.strftime('%d %b')}"
    else:
        how = "Pickup at distribution center"
    db.add(Notification(
        userId=listing.farmerId,
        message=f"{prefix} for {listing.cropName} ({order.quantity} {listing.unit}) — {how}. Tracking #{order.trackingNumber}.",
        isRead=False,
    ))

@router.post("/verify")
def verify_payment(req: RazorpayVerifyReq, db: Session = Depends(get_db), current_user: dict = Depends(get_current_consumer)):
    """Verify Razorpay payment signature."""
    is_valid = verify_razorpay_signature(req.razorpay_order_id, req.razorpay_payment_id, req.razorpay_signature)
    
    if not is_valid:
        raise HTTPException(status_code=400, detail="Invalid payment signature")
        
    # Update orders to PAID
    orders = db.query(Order).filter(
        Order.razorpayOrderId == req.razorpay_order_id,
        Order.consumerId == current_user.get("userId")
    ).all()
    
    if not orders:
        raise HTTPException(status_code=404, detail="Orders not found for this payment")
        
    for order in orders:
        if order.status == OrderStatus.PAID:
            continue
        order.status = OrderStatus.PAID
        order.razorpayPaymentId = req.razorpay_payment_id
        order.razorpaySignature = req.razorpay_signature
        order.trackingEvents.append(OrderTrackingEvent(
            status="PAYMENT_CONFIRMED",
            title="Payment received",
            description="Your online payment was successful.",
        ))
        _notify_farmer(db, order, "New paid order")
        
    # Clear the cart after successful payment
    cart = db.query(Cart).filter(Cart.consumerId == current_user.get("userId")).first()
    if cart and cart.items:
        for item in cart.items:
            db.delete(item)
            
    db.commit()
    
    # We would ideally construct order_details similar to checkout or fetch it, 
    # but for simplicity, we pass a basic dict or could just send order count
    send_order_confirmation(current_user.get("phone", "") + "@example.com", {
        "total_amount": sum(o.totalPrice + (o.deliveryFee or 0) for o in orders),
        "tracking_numbers": [o.trackingNumber for o in orders if o.trackingNumber],
    })
    
    return {"message": "Payment verified successfully", "orders_updated": len(orders)}
