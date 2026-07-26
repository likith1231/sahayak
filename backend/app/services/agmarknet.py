import os
import httpx
import logging
from sqlalchemy.orm import Session
from app.models import Listing

logger = logging.getLogger(__name__)

AGMARKNET_API_KEY = os.getenv("AGMARKNET_API_KEY")
AGMARKNET_URL = "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070"

# Mapping from our internal crop names to Agmarknet commodity names
CROP_NAME_MAPPING = {
    "Tomato": "Tomato",
    "Potato": "Potato",
    "Onion": "Onion",
    "Mango": "Mango",
    "Rice": "Paddy(Dhan)(Common)",
    "Wheat": "Wheat",
    "Turmeric": "Turmeric",
    "Sugarcane": "Sugarcane",
    "Milk": "Milk", # Milk may not be in agmarknet, will fallback
}

async def fetch_karnataka_prices():
    """Fetch prices for Karnataka from Agmarknet."""
    if not AGMARKNET_API_KEY:
        logger.warning("No AGMARKNET_API_KEY found, skipping live price fetch.")
        return {}

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                AGMARKNET_URL,
                params={
                    "api-key": AGMARKNET_API_KEY,
                    "format": "json",
                    "filters[state]": "Karnataka",
                    "limit": 1000
                },
                timeout=10.0
            )
            response.raise_for_status()
            data = response.json()
            records = data.get("records", [])
            
            commodity_prices = {}
            for record in records:
                commodity = record.get("commodity")
                modal_price = record.get("modal_price") 
                
                if commodity and modal_price:
                    try:
                        price = float(modal_price)
                        # Agmarknet prices are usually per Quintal (100kg). 
                        price_per_kg = price / 100.0
                        if commodity not in commodity_prices:
                            commodity_prices[commodity] = []
                        commodity_prices[commodity].append(price_per_kg)
                    except ValueError:
                        pass
                        
            avg_prices = {
                k: sum(v)/len(v) for k, v in commodity_prices.items()
            }
            return avg_prices
            
    except Exception as e:
        logger.error(f"Failed to fetch Agmarknet prices: {e}")
        return {}

async def sync_prices(db: Session):
    """Sync prices for all active listings based on Agmarknet data."""
    prices = await fetch_karnataka_prices()
    if not prices:
        return
        
    listings = db.query(Listing).filter(Listing.status == "AVAILABLE").all()
    updated_count = 0
    failed_matches = set()
    
    for listing in listings:
        agmarknet_name = CROP_NAME_MAPPING.get(listing.cropName)
        if not agmarknet_name:
            failed_matches.add(listing.cropName)
            continue
            
        new_price = prices.get(agmarknet_name)
        if new_price is not None:
            listing.price = round(new_price, 2)
            updated_count += 1
        else:
            failed_matches.add(listing.cropName)
            
    if failed_matches:
        logger.info(f"Could not find new prices for crops: {', '.join(failed_matches)}. Kept existing prices.")
        
    db.commit()
    logger.info(f"Updated prices for {updated_count} listings.")
