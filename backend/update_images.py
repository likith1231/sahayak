import asyncio
import sys
import os
import random

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.database import SessionLocal
from app.models import Listing
from app.services.unsplash import fetch_crop_images, SPECIFIC_QUERIES, ALTERNATE_QUERIES

async def main():
    db = SessionLocal()
    crops = db.query(Listing.cropName).distinct().all()
    crops = [c[0] for c in crops]
    
    print("Auditing & Updating Image Assignments...")
    
    unresolved = []
    
    for crop in crops:
        print(f"\nProcessing Crop: {crop}")
        primary_q = SPECIFIC_QUERIES.get(crop, f"raw {crop.lower()}")
        alt_q = ALTERNATE_QUERIES.get(crop, f"{crop.lower()} farm")
        print(f"Primary Query: '{primary_q}' | Alternate Query: '{alt_q}'")
        
        urls = await fetch_crop_images(crop, count=3)
        if not urls:
            print(f"--> UNRESOLVED: Failed to find any match for {crop}.")
            unresolved.append(crop)
            continue
            
        print(f"--> Success! Fetched {len(urls)} images.")
        
        # Update existing listings
        listings = db.query(Listing).filter(Listing.cropName == crop).all()
        for listing in listings:
            listing.photoUrl = random.choice(urls)
        db.commit()
        print(f"--> Updated {len(listings)} listings for {crop}. Sample URL: {urls[0]}")
    
    print("\n====================")
    print("Summary of Unresolved Crops:")
    if unresolved:
        for u in unresolved:
            print(f"- {u}")
    else:
        print("None! All crops were successfully matched.")
    print("====================")
    
    db.close()

if __name__ == "__main__":
    asyncio.run(main())
