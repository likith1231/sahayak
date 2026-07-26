from app.database import SessionLocal
from app.models import Listing, MandiPrice
db = SessionLocal()
print("Listings count:", db.query(Listing).count())
print("MandiPrices count:", db.query(MandiPrice).count())
db.close()
