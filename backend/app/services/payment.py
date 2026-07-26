import os
import hmac
import hashlib
import razorpay
from fastapi import HTTPException
import logging

logger = logging.getLogger(__name__)

RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET")

# Initialize client only if keys are present
client = None
if RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET:
    try:
        client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
    except Exception as e:
        logger.error(f"Failed to initialize Razorpay client: {e}")

def create_razorpay_order(amount: float, currency: str = "INR", receipt: str = None) -> dict:
    """Create a Razorpay order. Amount is in INR."""
    if not client:
        logger.error("Razorpay keys not configured. Cannot create order.")
        raise HTTPException(status_code=500, detail="Payment gateway not configured properly")
    
    try:
        data = {
            "amount": int(amount * 100), # Razorpay expects amount in paise
            "currency": currency,
            "receipt": receipt,
            "payment_capture": 1 # Auto capture
        }
        order = client.order.create(data=data)
        return order
    except Exception as e:
        logger.error(f"Razorpay order creation failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to initiate payment")

def verify_razorpay_signature(order_id: str, payment_id: str, signature: str) -> bool:
    """Verify Razorpay payment signature."""
    if not client:
        logger.error("Razorpay keys not configured. Cannot verify signature.")
        return False
        
    try:
        # Verify the signature
        client.utility.verify_payment_signature({
            'razorpay_order_id': order_id,
            'razorpay_payment_id': payment_id,
            'razorpay_signature': signature
        })
        return True
    except razorpay.errors.SignatureVerificationError:
        logger.error("Razorpay signature verification failed")
        return False
    except Exception as e:
        logger.error(f"Error verifying signature: {e}")
        return False
