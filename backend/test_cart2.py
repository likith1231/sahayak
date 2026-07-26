from app.database import SessionLocal
from app.models import Listing, User
from app.routers.cart import add_cart_item
from app.schemas import CartItemCreate, CartItemResponse

db = SessionLocal()
listing = db.query(Listing).first()
consumer = db.query(User).filter(User.role == "CONSUMER").first()

req = CartItemCreate(listingId=listing.id, quantity=1)
try:
    res = add_cart_item(item_req=req, db=db, current_user={"userId": consumer.id, "role": "CONSUMER"})
    # simulate FastAPI pydantic validation
    response = CartItemResponse.model_validate(res, from_attributes=True)
    print("Success:", response)
except Exception as e:
    print("Error during validation:", repr(e))

db.close()
