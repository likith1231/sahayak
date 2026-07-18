import enum
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, Boolean, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.database import Base

class Role(str, enum.Enum):
    FARMER = "FARMER"
    CONSUMER = "CONSUMER"
    NGO = "NGO"
    ADMIN = "ADMIN"

class ListingStatus(str, enum.Enum):
    AVAILABLE = "AVAILABLE"
    SOLD_OUT = "SOLD_OUT"
    REMOVED = "REMOVED"

class OrderStatus(str, enum.Enum):
    PLACED = "PLACED"
    CONFIRMED = "CONFIRMED"
    DELIVERED = "DELIVERED"
    CANCELLED = "CANCELLED"

class RequestStatus(str, enum.Enum):
    OPEN = "OPEN"
    CLAIMED = "CLAIMED"
    FULFILLED = "FULFILLED"

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "User"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    phone = Column(String, unique=True, nullable=False)
    email = Column(String, unique=True, nullable=True)
    passwordHash = Column(String, nullable=False)
    role = Column(SQLEnum(Role), nullable=False)
    createdAt = Column(DateTime, default=datetime.utcnow)

    listings = relationship("Listing", back_populates="farmer")
    orders = relationship("Order", back_populates="consumer")
    emergencyRequests = relationship("EmergencyRequest", back_populates="consumer", foreign_keys="EmergencyRequest.consumerId")
    ngoProfile = relationship("NGO", back_populates="user", uselist=False)

class Listing(Base):
    __tablename__ = "Listing"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    farmerId = Column(String, ForeignKey("User.id"), nullable=False)
    cropName = Column(String, nullable=False)
    quantity = Column(Float, nullable=False)
    unit = Column(String, nullable=False)
    price = Column(Float, nullable=False)
    harvestDate = Column(DateTime, nullable=False)
    photoUrl = Column(String, nullable=True)
    status = Column(SQLEnum(ListingStatus), default=ListingStatus.AVAILABLE)
    createdAt = Column(DateTime, default=datetime.utcnow)

    farmer = relationship("User", back_populates="listings")
    orders = relationship("Order", back_populates="listing")

class Order(Base):
    __tablename__ = "Order"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    consumerId = Column(String, ForeignKey("User.id"), nullable=False)
    listingId = Column(String, ForeignKey("Listing.id"), nullable=False)
    quantity = Column(Float, nullable=False)
    totalPrice = Column(Float, nullable=False)
    status = Column(SQLEnum(OrderStatus), default=OrderStatus.PLACED)
    createdAt = Column(DateTime, default=datetime.utcnow)

    consumer = relationship("User", back_populates="orders")
    listing = relationship("Listing", back_populates="orders")

class EmergencyRequest(Base):
    __tablename__ = "EmergencyRequest"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    consumerId = Column(String, ForeignKey("User.id"), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    needType = Column(String, nullable=False)
    status = Column(SQLEnum(RequestStatus), default=RequestStatus.OPEN)
    createdAt = Column(DateTime, default=datetime.utcnow)
    claimedById = Column(String, ForeignKey("User.id"), nullable=True)

    consumer = relationship("User", foreign_keys=[consumerId], back_populates="emergencyRequests")
    claimedBy = relationship("User", foreign_keys=[claimedById])

class NGO(Base):
    __tablename__ = "NGO"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    userId = Column(String, ForeignKey("User.id"), unique=True, nullable=False)
    organizationName = Column(String, nullable=False)
    verificationStatus = Column(Boolean, default=False)
    documentUrl = Column(String, nullable=True)
    createdAt = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="ngoProfile")
