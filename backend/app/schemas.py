from pydantic import BaseModel, ConfigDict
from typing import Optional
from app.models import Role

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

class UserResponse(BaseModel):
    id: str
    name: str
    role: Role
    
    model_config = ConfigDict(from_attributes=True)

class AuthResponse(BaseModel):
    token: str
    user: UserResponse

from datetime import datetime

class ListingCreateReq(BaseModel):
    cropName: str
    quantity: float
    unit: str
    price: float
    harvestDate: datetime
    photoUrl: Optional[str] = None

class OrderCreateReq(BaseModel):
    listingId: str
    quantity: float

class EmergencyCreateReq(BaseModel):
    latitude: float
    longitude: float
    needType: str

class NGORegisterReq(BaseModel):
    organizationName: str
    documentUrl: Optional[str] = None
