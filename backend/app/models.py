import enum
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, Boolean, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector
from app.database import Base
class Role(str, enum.Enum):
    FARMER = "FARMER"
    CONSUMER = "CONSUMER"
    NGO = "NGO"
    ADMIN = "ADMIN"
    KITCHEN_PARTNER = "KITCHEN_PARTNER"

class ListingStatus(str, enum.Enum):
    AVAILABLE = "AVAILABLE"
    SOLD_OUT = "SOLD_OUT"
    REMOVED = "REMOVED"

class OrderStatus(str, enum.Enum):
    PENDING_PAYMENT = "PENDING_PAYMENT"
    PENDING_PAYMENT_AT_PICKUP = "PENDING_PAYMENT_AT_PICKUP"
    PAID = "PAID"
    PLACED = "PLACED"
    CONFIRMED = "CONFIRMED"
    DELIVERED = "DELIVERED"
    CANCELLED = "CANCELLED"

class PaymentMethod(str, enum.Enum):
    UPI = "UPI"
    CARD = "CARD"
    CASH_ON_PICKUP = "CASH_ON_PICKUP"

class RequestStatus(str, enum.Enum):
    OPEN = "OPEN"
    CLAIMED = "CLAIMED"
    FULFILLED = "FULFILLED"

class WindowStatus(str, enum.Enum):
    PENDING_CONFIRMATION = "PENDING_CONFIRMATION"
    ACTIVE = "ACTIVE"
    RESOLVED = "RESOLVED"

class PledgeStatus(str, enum.Enum):
    AVAILABLE = "AVAILABLE"
    COMMITTED = "COMMITTED"
    FULFILLED = "FULFILLED"

class ListingCategory(str, enum.Enum):
    VEGETABLES = "Vegetables"
    FRUITS = "Fruits"
    GRAINS = "Grains"
    SPICES = "Spices"

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "User"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    phone = Column(String, unique=False, nullable=False)
    email = Column(String, unique=True, nullable=True)
    passwordHash = Column(String, nullable=False)
    role = Column(SQLEnum(Role), nullable=False)
    location = Column(String, nullable=True)
    assignedMandiId = Column(String, ForeignKey("DistributionCenter.id"), nullable=True)
    createdAt = Column(DateTime, default=datetime.utcnow)

    listings = relationship("Listing", back_populates="farmer")
    orders = relationship("Order", back_populates="consumer")
    emergencyRequests = relationship("EmergencyRequest", back_populates="consumer", foreign_keys="EmergencyRequest.consumerId")
    ngoProfile = relationship("NGO", back_populates="user", uselist=False)
    kitchenProfile = relationship("KitchenPartner", back_populates="user", uselist=False)
    cart = relationship("Cart", back_populates="consumer", uselist=False)
    notifications = relationship("Notification", back_populates="user")
    assignedMandi = relationship("DistributionCenter", foreign_keys=[assignedMandiId])
    savedMandis = relationship("SavedMandi", back_populates="user", cascade="all, delete")

class SavedMandi(Base):
    __tablename__ = "SavedMandi"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    userId = Column(String, ForeignKey("User.id"), nullable=False)
    mandiId = Column(String, ForeignKey("DistributionCenter.id"), nullable=False)
    createdAt = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="savedMandis")
    mandi = relationship("DistributionCenter")

class DistributionCenter(Base):
    __tablename__ = "DistributionCenter"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    district = Column(String, nullable=False)
    address = Column(String, nullable=False)
    createdAt = Column(DateTime, default=datetime.utcnow)
    
    listings = relationship("Listing", back_populates="distributionCenter")
    orders = relationship("Order", back_populates="pickupCenter")

class Listing(Base):
    __tablename__ = "Listing"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    farmerId = Column(String, ForeignKey("User.id"), nullable=False)
    cropName = Column(String, nullable=False)
    quantity = Column(Float, nullable=False)
    unit = Column(String, nullable=False)
    price = Column(Float, nullable=False)
    harvestDate = Column(DateTime, nullable=False)
    location = Column(String, nullable=True)
    category = Column(SQLEnum(ListingCategory), nullable=True)
    qualityGrade = Column(String, nullable=True)
    status = Column(SQLEnum(ListingStatus), default=ListingStatus.AVAILABLE)
    distributionCenterId = Column(String, ForeignKey("DistributionCenter.id"), nullable=True)
    embedding = Column(Vector(3072), nullable=True)
    createdAt = Column(DateTime, default=datetime.utcnow)

    farmer = relationship("User", back_populates="listings")
    distributionCenter = relationship("DistributionCenter", back_populates="listings")
    orders = relationship("Order", back_populates="listing")
    cartItems = relationship("CartItem", back_populates="listing")

class Order(Base):
    __tablename__ = "Order"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    consumerId = Column(String, ForeignKey("User.id"), nullable=False)
    listingId = Column(String, ForeignKey("Listing.id"), nullable=False)
    quantity = Column(Float, nullable=False)
    totalPrice = Column(Float, nullable=False)
    status = Column(SQLEnum(OrderStatus), default=OrderStatus.PENDING_PAYMENT)
    paymentMethod = Column(SQLEnum(PaymentMethod), nullable=True)
    pickupCenterId = Column(String, ForeignKey("DistributionCenter.id"), nullable=True)
    razorpayOrderId = Column(String, nullable=True)
    razorpayPaymentId = Column(String, nullable=True)
    razorpaySignature = Column(String, nullable=True)
    createdAt = Column(DateTime, default=datetime.utcnow)

    consumer = relationship("User", back_populates="orders")
    listing = relationship("Listing", back_populates="orders")
    pickupCenter = relationship("DistributionCenter", back_populates="orders")

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
    targetMandiId = Column(String, ForeignKey("DistributionCenter.id"), nullable=True)

    consumer = relationship("User", foreign_keys=[consumerId], back_populates="emergencyRequests")
    claimedBy = relationship("User", foreign_keys=[claimedById])
    targetMandi = relationship("DistributionCenter")

class NGO(Base):
    __tablename__ = "NGO"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    userId = Column(String, ForeignKey("User.id"), unique=True, nullable=False)
    organizationName = Column(String, nullable=False)
    verificationStatus = Column(Boolean, default=False)
    documentUrl = Column(String, nullable=True)
    createdAt = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="ngoProfile")

class Cart(Base):
    __tablename__ = "Cart"

    id = Column(String, primary_key=True, default=generate_uuid)
    consumerId = Column(String, ForeignKey("User.id"), unique=True, nullable=False)
    createdAt = Column(DateTime, default=datetime.utcnow)

    consumer = relationship("User", back_populates="cart")
    items = relationship("CartItem", back_populates="cart", cascade="all, delete")

class CartItem(Base):
    __tablename__ = "CartItem"

    id = Column(String, primary_key=True, default=generate_uuid)
    cartId = Column(String, ForeignKey("Cart.id"), nullable=False)
    listingId = Column(String, ForeignKey("Listing.id"), nullable=False)
    quantity = Column(Float, nullable=False)
    createdAt = Column(DateTime, default=datetime.utcnow)

    cart = relationship("Cart", back_populates="items")
    listing = relationship("Listing", back_populates="cartItems")

class KitchenPartner(Base):
    __tablename__ = "KitchenPartner"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    userId = Column(String, ForeignKey("User.id"), unique=True, nullable=False)
    kitchenName = Column(String, nullable=False)
    verificationStatus = Column(Boolean, default=False)
    documentUrl = Column(String, nullable=True)
    createdAt = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="kitchenProfile")
    pledges = relationship("FoodPledge", back_populates="kitchen")

class FoodPledge(Base):
    __tablename__ = "FoodPledge"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    kitchenId = Column(String, ForeignKey("KitchenPartner.id"), nullable=False)
    capacity = Column(Float, nullable=False)
    status = Column(SQLEnum(PledgeStatus), default=PledgeStatus.AVAILABLE)
    createdAt = Column(DateTime, default=datetime.utcnow)

    kitchen = relationship("KitchenPartner", back_populates="pledges")

class EmergencyWindow(Base):
    __tablename__ = "EmergencyWindow"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    district = Column(String, nullable=False)
    reason = Column(String, nullable=False)
    status = Column(SQLEnum(WindowStatus), default=WindowStatus.PENDING_CONFIRMATION)
    createdAt = Column(DateTime, default=datetime.utcnow)

class Notification(Base):
    __tablename__ = "Notification"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    userId = Column(String, ForeignKey("User.id"), nullable=False)
    message = Column(String, nullable=False)
    isRead = Column(Boolean, default=False)
    createdAt = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="notifications")

class MandiPrice(Base):
    __tablename__ = "MandiPrice"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    cropName = Column(String, nullable=False)
    state = Column(String, nullable=False)
    district = Column(String, nullable=False)
    market = Column(String, nullable=False)
    minPrice = Column(Float, nullable=False)
    maxPrice = Column(Float, nullable=False)
    modalPrice = Column(Float, nullable=False)
    arrivalDate = Column(DateTime, nullable=False)
    embedding = Column(Vector(3072), nullable=True)
    createdAt = Column(DateTime, default=datetime.utcnow)
