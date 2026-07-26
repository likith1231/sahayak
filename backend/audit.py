import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.database import SessionLocal
from app.models import Listing

db = SessionLocal()
results = db.query(Listing.cropName, Listing.photoUrl).distinct().all()
for crop, url in results:
    print(f"{crop}: {url}")
db.close()
