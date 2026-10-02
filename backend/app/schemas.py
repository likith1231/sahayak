from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from app.models import Role

class DistributionCenterResponse(BaseModel):
    id: str
    name: str
    district: str
    address: str
    
    model_config = ConfigDict(from_attributes=True)

class UserRegisterReq(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None
    password: str
    role: Role

class UserLoginReq(BaseModel):
    phone: Optional[str] = None
    email: Optional[str] = None
    password: str

class NGOProfileResponse(BaseModel):
    organizationName: str
    verificationStatus: bool

    model_config = ConfigDict(from_attributes=True)

class UserUpdateReq(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    location: Optional[str] = None

class PasswordUpdateReq(BaseModel):
    currentPassword: str
    newPassword: str

class SavedMandiCreateReq(BaseModel):
    mandiId: str

class SavedMandiResponse(BaseModel):
    id: str
    mandiId: str
    mandi: Optional[DistributionCenterResponse] = None

    model_config = ConfigDict(from_attributes=True)

class UserResponse(BaseModel):
    id: str
    name: str
    role: Role
    email: Optional[str] = None
    phone: str
    location: Optional[str] = None
    ngoProfile: Optional[NGOProfileResponse] = None
    assignedMandi: Optional[DistributionCenterResponse] = None
    savedMandis: Optional[List[SavedMandiResponse]] = None
    
    model_config = ConfigDict(from_attributes=True)

class AuthResponse(BaseModel):
    token: str
    user: UserResponse

from datetime import datetime
from typing import List, Optional
from app.models import ListingCategory

class ListingCreateReq(BaseModel):
    cropName: str
    quantity: float
    unit: str
    price: float
    harvestDate: datetime
    location: Optional[str] = None
    category: Optional[ListingCategory] = None

class ListingUpdateReq(BaseModel):
    quantity: Optional[float] = None
    price: Optional[float] = None

class OrderCreateReq(BaseModel):
    listingId: str
    quantity: float

class EmergencyCreateReq(BaseModel):
    latitude: float
    longitude: float
    needType: str
    targetMandiId: Optional[str] = None

class NGORegisterReq(BaseModel):
    organizationName: str
    documentUrl: Optional[str] = None

class CartItemCreate(BaseModel):
    listingId: str
    quantity: float

class CartItemUpdate(BaseModel):
    quantity: float

class CartItemResponse(BaseModel):
    id: str
    listingId: str
    quantity: float
    # Optionally include listing details
    
    model_config = ConfigDict(from_attributes=True)

class CartResponse(BaseModel):
    id: str
    items: List[CartItemResponse]
    
    model_config = ConfigDict(from_attributes=True)

class DeliveryAddressIn(BaseModel):
    name: str
    phone: str
    line1: str
    line2: Optional[str] = None
    landmark: Optional[str] = None
    city: str
    pincode: str

class AddressCreateReq(DeliveryAddressIn):
    label: Optional[str] = "Home"
    isDefault: Optional[bool] = False

class AddressUpdateReq(BaseModel):
    label: Optional[str] = None
    name: Optional[str] = None
    phone: Optional[str] = None
    line1: Optional[str] = None
    line2: Optional[str] = None
    landmark: Optional[str] = None
    city: Optional[str] = None
    pincode: Optional[str] = None
    isDefault: Optional[bool] = None

class CheckoutReq(BaseModel):
    paymentMethod: Optional[str] = "UPI"
    distributionCenterId: Optional[str] = None
    fulfillmentType: Optional[str] = "PICKUP"
    addressId: Optional[str] = None
    address: Optional[DeliveryAddressIn] = None
    deliveryDate: Optional[str] = None
    deliverySlot: Optional[str] = None
    deliveryInstructions: Optional[str] = None

class OrderStatusUpdateReq(BaseModel):
    status: str
    note: Optional[str] = None
    location: Optional[str] = None
    otp: Optional[str] = None
    deliveryPartnerName: Optional[str] = None
    deliveryPartnerPhone: Optional[str] = None

class OrderCancelReq(BaseModel):
    reason: Optional[str] = None

class OrderRateReq(BaseModel):
    rating: int
    review: Optional[str] = None

class RazorpayVerifyReq(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
