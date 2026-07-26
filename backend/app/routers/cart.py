from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Cart, CartItem, Listing, User, ListingStatus
from app.auth.dependencies import get_current_consumer
from app.schemas import CartItemCreate, CartResponse, CartItemResponse, CartItemUpdate

router = APIRouter(prefix="/api/cart", tags=["Cart"])

def get_or_create_cart(db: Session, consumer_id: str) -> Cart:
    cart = db.query(Cart).filter(Cart.consumerId == consumer_id).first()
    if not cart:
        cart = Cart(consumerId=consumer_id)
        db.add(cart)
        db.commit()
        db.refresh(cart)
    return cart

@router.get("", response_model=CartResponse)
def get_cart(db: Session = Depends(get_db), current_user: dict = Depends(get_current_consumer)):
    """Get the current user's cart and items."""
    cart = get_or_create_cart(db, current_user.get("userId"))
    return cart

@router.post("/items", response_model=CartItemResponse)
def add_cart_item(item_req: CartItemCreate, db: Session = Depends(get_db), current_user: dict = Depends(get_current_consumer)):
    """Add an item to the cart."""
    if item_req.quantity <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be positive")
        
    listing = db.query(Listing).filter(Listing.id == item_req.listingId).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
        
    if listing.status != ListingStatus.AVAILABLE:
        raise HTTPException(status_code=400, detail="Listing is not available")
        
    if listing.quantity < item_req.quantity:
        raise HTTPException(status_code=400, detail="Not enough quantity available")

    cart = get_or_create_cart(db, current_user.get("userId"))
    
    # Check if item already exists in cart, then update quantity
    existing_item = db.query(CartItem).filter(
        CartItem.cartId == cart.id,
        CartItem.listingId == item_req.listingId
    ).first()
    
    if existing_item:
        new_quantity = existing_item.quantity + item_req.quantity
        if listing.quantity < new_quantity:
            raise HTTPException(status_code=400, detail="Not enough quantity available for combined total")
        existing_item.quantity = new_quantity
        db.commit()
        db.refresh(existing_item)
        return existing_item
    else:
        new_item = CartItem(
            cartId=cart.id,
            listingId=item_req.listingId,
            quantity=item_req.quantity
        )
        db.add(new_item)
        db.commit()
        db.refresh(new_item)
        return new_item

@router.put("/items/{item_id}", response_model=CartItemResponse)
def update_cart_item(item_id: str, update_req: CartItemUpdate, db: Session = Depends(get_db), current_user: dict = Depends(get_current_consumer)):
    """Update cart item quantity."""
    if update_req.quantity <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be positive")
        
    cart = get_or_create_cart(db, current_user.get("userId"))
    item = db.query(CartItem).filter(CartItem.id == item_id, CartItem.cartId == cart.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Cart item not found")
        
    listing = db.query(Listing).filter(Listing.id == item.listingId).first()
    if listing and listing.quantity < update_req.quantity:
        raise HTTPException(status_code=400, detail="Not enough quantity available")
        
    item.quantity = update_req.quantity
    db.commit()
    db.refresh(item)
    return item

@router.delete("/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_cart_item(item_id: str, db: Session = Depends(get_db), current_user: dict = Depends(get_current_consumer)):
    """Remove an item from the cart."""
    cart = get_or_create_cart(db, current_user.get("userId"))
    item = db.query(CartItem).filter(CartItem.id == item_id, CartItem.cartId == cart.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Cart item not found")
        
    db.delete(item)
    db.commit()
    return None
