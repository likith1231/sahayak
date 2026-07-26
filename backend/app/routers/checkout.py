from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List, Dict, Any

from app.database import get_db
from app.models import Cart, CartItem, Listing, Order, User, ListingStatus, OrderStatus, Notification, PaymentMethod
from app.schemas import RazorpayVerifyReq, CheckoutReq
from app.auth.dependencies import get_current_consumer
from app.services.payment import create_razorpay_order, verify_razorpay_signature
from app.services.email import send_order_confirmation
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

@router.post("")
def checkout(req: CheckoutReq, db: Session = Depends(get_db), current_user: dict = Depends(get_current_consumer)):
    """Checkout all items in the user's cart."""
    cart = db.query(Cart).filter(Cart.consumerId == current_user.get("userId")).first()
    if not cart or not cart.items:
        raise HTTPException(status_code=400, detail="Cart is empty")
        
    total_amount = 0.0
    created_orders = []
    pickup_details = {} # { dc_id: { "dc": {}, "items": [] } }
    
    # Start atomic transaction
    try:
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
            order_status = OrderStatus.PENDING_PAYMENT_AT_PICKUP if req.paymentMethod == "CASH_ON_PICKUP" else OrderStatus.PENDING_PAYMENT
            order = Order(
                consumerId=current_user.get("userId"),
                listingId=listing.id,
                quantity=item.quantity,
                totalPrice=item_total,
                status=order_status,
                paymentMethod=req.paymentMethod,
                pickupCenterId=listing.distributionCenterId
            )
            db.add(order)
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
        
        # We need the order IDs to store in Razorpay order if possible, 
        # but db.flush() gets the IDs.
        db.flush()
        
        # If Cash on Pickup, we don't need Razorpay
        if req.paymentMethod == "CASH_ON_PICKUP":
            for order in created_orders:
                # Notify farmer
                listing = db.query(Listing).filter(Listing.id == order.listingId).first()
                if listing:
                    notification = Notification(
                        userId=listing.farmerId,
                        message=f"New Cash on Pickup order received for {listing.cropName} ({order.quantity} {listing.unit}).",
                        isRead=False
                    )
                    db.add(notification)
            
            # Clear the cart
            for item in cart.items:
                db.delete(item)
                
            db.commit()
            
            # Send confirmation email
            order_details = {
                "total_amount": total_amount,
                "pickup_details": list(pickup_details.values())
            }
            send_order_confirmation(current_user.get("phone", "") + "@example.com", order_details)
            
            return {
                "message": "Checkout initiated (Cash on Pickup)",
                "razorpay_order": None,
                "orders_count": len(created_orders),
                "total_amount": total_amount,
                "pickup_details": list(pickup_details.values())
            }

        # Create Razorpay Order
        receipt_id = f"rcpt_{current_user.get('userId')[:8]}"
        rzp_order = create_razorpay_order(amount=total_amount, receipt=receipt_id)
        razorpay_order_id = rzp_order.get("id")
        
        # Link Razorpay Order ID to all created orders
        for order in created_orders:
            order.razorpayOrderId = razorpay_order_id
            
        # Do not clear the cart yet for Razorpay, it will be cleared upon verification
        db.commit()
        
        return {
            "message": "Checkout initiated",
            "razorpay_order": rzp_order,
            "orders_count": len(created_orders),
            "total_amount": total_amount,
            "pickup_details": list(pickup_details.values())
        }
        
    except ValueError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Checkout failed due to an internal error")

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
        order.status = OrderStatus.PAID
        order.razorpayPaymentId = req.razorpay_payment_id
        order.razorpaySignature = req.razorpay_signature
        
        # Notify farmer
        listing = db.query(Listing).filter(Listing.id == order.listingId).first()
        if listing:
            notification = Notification(
                userId=listing.farmerId,
                message=f"New order received for {listing.cropName} ({order.quantity} {listing.unit}).",
                isRead=False
            )
            db.add(notification)
        
    # Clear the cart after successful payment
    cart = db.query(Cart).filter(Cart.consumerId == current_user.get("userId")).first()
    if cart and cart.items:
        for item in cart.items:
            db.delete(item)
            
    db.commit()
    
    # We would ideally construct order_details similar to checkout or fetch it, 
    # but for simplicity, we pass a basic dict or could just send order count
    send_order_confirmation(current_user.get("phone", "") + "@example.com", {"total_amount": sum(o.totalPrice for o in orders)})
    
    return {"message": "Payment verified successfully", "orders_updated": len(orders)}
