import os
import random
import datetime
import sys
import asyncio

# Ensure backend directory is in sys.path if run directly
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, engine, Base
from sqlalchemy import text
from app.models import User, Role, Listing, ListingStatus, Order, OrderStatus, EmergencyRequest, RequestStatus, ListingCategory, KitchenPartner, FoodPledge, PledgeStatus, EmergencyWindow, WindowStatus, Notification, DistributionCenter, MandiPrice
from app.auth.password import get_password_hash
from google import genai
from google.genai import types

# Crop mappings
# Structure: "CropName": (ListingCategory, ["District1", "District2"])
CROP_MAPPINGS = {
    "Tomatoes": (ListingCategory.VEGETABLES, ["Kolar", "Chikkaballapur"]),
    "Potatoes": (ListingCategory.VEGETABLES, ["Hassan", "Belagavi"]),
    "Onions": (ListingCategory.VEGETABLES, ["Chitradurga", "Dharwad"]),
    "Carrots": (ListingCategory.VEGETABLES, ["Chikkaballapur", "Bengaluru Rural"]),
    "Spinach": (ListingCategory.VEGETABLES, ["Bengaluru Urban", "Mysuru"]),
    "Cabbage": (ListingCategory.VEGETABLES, ["Belagavi", "Hassan"]),
    "Cauliflower": (ListingCategory.VEGETABLES, ["Belagavi", "Hassan"]),
    "Peas": (ListingCategory.VEGETABLES, ["Chikkamagaluru", "Kolar"]),
    "Mangoes": (ListingCategory.FRUITS, ["Ramanagara", "Kolar", "Chikkaballapur"]),
    "Apples": (ListingCategory.FRUITS, ["Kodagu", "Chikkamagaluru"]), 
    "Bananas": (ListingCategory.FRUITS, ["Chitradurga", "Tumakuru", "Mysuru"]),
    "Grapes": (ListingCategory.FRUITS, ["Vijayapura", "Bagalkot"]),
    "Oranges": (ListingCategory.FRUITS, ["Kodagu", "Chikkamagaluru"]),
    "Rice": (ListingCategory.GRAINS, ["Mandya", "Mysuru", "Raichur", "Koppal"]),
    "Wheat": (ListingCategory.GRAINS, ["Dharwad", "Belagavi", "Vijayapura"]),
    "Corn": (ListingCategory.GRAINS, ["Davanagere", "Haveri", "Shivamogga"]),
    "Garlic": (ListingCategory.SPICES, ["Chikkamagaluru", "Hassan"]),
    "Ginger": (ListingCategory.SPICES, ["Shivamogga", "Hassan", "Kodagu"]),
    "Turmeric": (ListingCategory.SPICES, ["Belagavi", "Haveri", "Chamarajanagar"]),
    "Sugarcane": (ListingCategory.SPICES, ["Belagavi", "Mandya", "Bagalkot"]), 
}

CROP_RULES = {
    "Tomatoes": {"units": ["kg", "quintal"], "min_price": 10, "max_price": 60},
    "Potatoes": {"units": ["kg", "quintal"], "min_price": 15, "max_price": 50},
    "Onions": {"units": ["kg", "quintal"], "min_price": 20, "max_price": 80},
    "Carrots": {"units": ["kg", "quintal"], "min_price": 30, "max_price": 70},
    "Spinach": {"units": ["bunch", "kg"], "min_price": 5, "max_price": 30},
    "Cabbage": {"units": ["kg", "piece"], "min_price": 10, "max_price": 40},
    "Cauliflower": {"units": ["kg", "piece"], "min_price": 15, "max_price": 50},
    "Peas": {"units": ["kg"], "min_price": 40, "max_price": 120},
    "Mangoes": {"units": ["kg", "dozen", "box"], "min_price": 50, "max_price": 300},
    "Apples": {"units": ["kg", "box"], "min_price": 80, "max_price": 250},
    "Bananas": {"units": ["dozen", "kg"], "min_price": 20, "max_price": 80},
    "Grapes": {"units": ["kg"], "min_price": 40, "max_price": 150},
    "Oranges": {"units": ["kg", "dozen"], "min_price": 30, "max_price": 100},
    "Rice": {"units": ["kg", "quintal"], "min_price": 40, "max_price": 100},
    "Wheat": {"units": ["kg", "quintal"], "min_price": 30, "max_price": 80},
    "Corn": {"units": ["kg", "quintal"], "min_price": 15, "max_price": 40},
    "Garlic": {"units": ["kg"], "min_price": 100, "max_price": 300},
    "Ginger": {"units": ["kg"], "min_price": 80, "max_price": 250},
    "Turmeric": {"units": ["kg"], "min_price": 100, "max_price": 300},
    "Sugarcane": {"units": ["ton"], "min_price": 2000, "max_price": 4000},
}

def generate_embeddings(texts):
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("Warning: GEMINI_API_KEY not set. Skipping embeddings.")
        return [None] * len(texts)
    
    client = genai.Client(api_key=api_key)
    print(f"Generating embeddings for {len(texts)} items...")
    
    import time
    # Process in chunks of 50 to avoid rate limits
    chunk_size = 50
    all_embeddings = []
    
    for i in range(0, len(texts), chunk_size):
        chunk = texts[i:i+chunk_size]
        try:
            response = client.models.embed_content(
                model='gemini-embedding-001',
                contents=chunk,
                config=types.EmbedContentConfig(task_type="RETRIEVAL_DOCUMENT")
            )
            for emb in response.embeddings:
                all_embeddings.append(emb.values)
        except Exception as e:
            print(f"Error generating embeddings for chunk: {e}")
            all_embeddings.extend([None] * len(chunk))
            
        if i + chunk_size < len(texts):
            print("Sleeping for 60 seconds to avoid rate limits...")
            time.sleep(60)
            
    return all_embeddings

async def seed_db_async():
    print("Dropping all tables...")
    Base.metadata.drop_all(bind=engine)
    print("Recreating all tables...")
    Base.metadata.create_all(bind=engine)
    
    print("Creating HNSW index on Listing embedding...")
    try:
        import sqlalchemy
        with engine.connect() as conn:
            conn.execute(sqlalchemy.text("CREATE INDEX IF NOT EXISTS ix_listing_embedding ON \"Listing\" USING hnsw (embedding vector_l2_ops);"))
            conn.commit()
    except Exception as e:
        print(f"Warning: Could not create pgvector index (ensure pgvector is installed and enabled): {e}")

    db = SessionLocal()

    password = "password123"
    hashed_pw = get_password_hash(password)

    # 1. Farmers
    farmers = []
    names = ["Ramesh", "Suresh", "Gita", "Sita", "Venkat", "Anand", "Rajesh", "Priya", "Kiran", "Amit",
             "Vijay", "Lakshmi", "Ravi", "Manoj", "Kavitha", "Ganesh", "Ashok", "Sanjay", "Meena", "Raju"]

    print("Creating farmers...")
    for i, name in enumerate(names):
        phone = f"99999999{i:02d}"
        farmer = User(
            name=name,
            phone=phone,
            passwordHash=hashed_pw,
            role=Role.FARMER,
            location=f"Farm near {names[i]}'s village, Karnataka"
        )
        db.add(farmer)
        farmers.append(farmer)

    lochan = User(
        name="lochan farmer",
        phone="8147294764",  # changed from 8147294763 to avoid clash with admin
        passwordHash=get_password_hash("123456"),
        role=Role.FARMER,
        location="Lochan Farm, Kolar, Karnataka"
    )
    db.add(lochan)
    farmers.append(lochan)

    db.commit()
    
    # Create Distribution Centers
    print("Creating distribution centers...")
    districts = set()
    for _, dists in CROP_MAPPINGS.values():
        districts.update(dists)
        
    REAL_DCS = {
        "Kolar": ["APMC Yard, Kolar", "Srinivaspura APMC Market", "Mulbagal APMC", "Bangarapet APMC"],
        "Chikkaballapur": ["APMC Market, Chikkaballapur", "Gauribidanur APMC", "Chintamani APMC", "Bagepalli APMC"],
        "Hassan": ["APMC Yard, B.M. Road, Hassan", "Arsikere APMC Market", "Channarayapatna APMC", "Holenarasipura APMC"],
        "Belagavi": ["APMC Market, Belagavi", "Bailhongal APMC Yard", "Gokak APMC", "Athani APMC"],
        "Chitradurga": ["APMC Yard, Chitradurga", "Hiriyur APMC Market", "Challakere APMC", "Hosadurga APMC"],
        "Dharwad": ["APMC Yard, Hubli", "APMC Market, Dharwad", "Kundgol APMC", "Navalgund APMC"],
        "Bengaluru Rural": ["APMC Yard, Doddaballapura", "APMC Market, Hoskote", "Nelamangala APMC", "Devanahalli APMC"],
        "Bengaluru Urban": ["Yeshwanthpur APMC Yard", "Singanayakanahalli APMC", "K.R. Market", "Kalasipalya Market"],
        "Mysuru": ["APMC Bandipalya, Mysuru", "Nanjangud APMC Yard", "Hunsur APMC", "K.R. Nagar APMC"],
        "Chikkamagaluru": ["APMC Market, Chikkamagaluru", "Kadur APMC Yard", "Tarikere APMC", "Koppa APMC"],
        "Ramanagara": ["APMC Yard, Ramanagara", "Channapatna APMC Market", "Magadi APMC", "Kanakapura APMC"],
        "Kodagu": ["APMC Yard, Madikeri", "Gonikoppal APMC Market", "Somwarpet APMC", "Virajpet APMC"],
        "Tumakuru": ["APMC Yard, Tumakuru", "Tiptur APMC Market", "Sira APMC", "Madhugiri APMC"],
        "Vijayapura": ["APMC Market, Vijayapura", "Sindagi APMC Yard", "Indi APMC", "Basavana Bagevadi APMC"],
        "Bagalkot": ["APMC Yard, Bagalkot", "Jamkhandi APMC Market", "Mudhol APMC", "Badami APMC"],
        "Mandya": ["APMC Yard, Mandya", "Maddur APMC Market", "K.R. Pet APMC", "Malavalli APMC"],
        "Raichur": ["APMC Yard, Raichur", "Sindhanur APMC Market", "Manvi APMC", "Lingasugur APMC"],
        "Koppal": ["APMC Yard, Koppal", "Gangavathi APMC Market", "Kushtagi APMC", "Yelburga APMC"],
        "Davanagere": ["APMC Yard, Davanagere", "Harihara APMC Market", "Honnali APMC", "Channagiri APMC"],
        "Haveri": ["APMC Market, Haveri", "Ranebennur APMC Yard", "Shiggaon APMC", "Byadgi APMC"],
        "Shivamogga": ["APMC Yard, Shivamogga", "Bhadravathi APMC Market", "Shikaripura APMC", "Sagar APMC"],
        "Chamarajanagar": ["APMC Yard, Chamarajanagar", "Gundlupet APMC Market", "Kollegal APMC", "Yelandur APMC"]
    }
    
    dcs = []
    for district, markets in REAL_DCS.items():
        if district in districts:
            for market_name in markets:
                dc = DistributionCenter(
                    name=market_name,
                    district=district,
                    address=f"{market_name}, {district}, Karnataka"
                )
                db.add(dc)
                dcs.append(dc)
    db.commit()

    # 2. Mandi Prices and Listings
    print("Preparing listings and mandi prices...")
    
    # Pre-assign a district and DC to each farmer
    farmer_locations = {}
    district_crops = {d: [] for d in districts}
    for crop, (_, dists) in CROP_MAPPINGS.items():
        for d in dists:
            district_crops[d].append(crop)
            
    for farmer in farmers:
        # Pick a district that has crops
        valid_districts = [d for d in districts if district_crops[d]]
        assigned_district = random.choice(valid_districts)
        district_dcs = [dc for dc in dcs if dc.district == assigned_district]
        assigned_dc = random.choice(district_dcs) if district_dcs else random.choice(dcs)
        farmer_locations[farmer.id] = (assigned_district, assigned_dc)
        
        # Update farmer's location to explicitly include the assigned district
        farmer.location = f"Farm near {farmer.name}'s village, {assigned_district}, Karnataka"
        
    db.commit()

    listings = []
    listing_texts = []
    crops = list(CROP_MAPPINGS.keys())
    
    for _ in range(120):
        farmer = random.choice(farmers)
        district, dc = farmer_locations[farmer.id]
        
        # Pick a crop that can be grown in this district
        possible_crops = district_crops[district]
        if not possible_crops:
            continue
        crop = random.choice(possible_crops)
        category = CROP_MAPPINGS[crop][0]
        
        rules = CROP_RULES[crop]
        unit = random.choice(rules["units"])
        quantity = round(random.uniform(10, 500), 2)
        price = round(random.uniform(rules["min_price"], rules["max_price"]), 2)
        
        days_ahead = random.randint(1, 90)
        harvest_date = datetime.datetime.utcnow() + datetime.timedelta(days=days_ahead)

        listing = Listing(
            farmerId=farmer.id,
            cropName=crop,
            quantity=quantity,
            unit=unit,
            price=price,
            harvestDate=harvest_date,
            location=district,
            category=category,
            distributionCenterId=dc.id,
            status=ListingStatus.AVAILABLE
        )
        listings.append(listing)
        
        text = f"Listing: {crop} ({category.value}) available in {district}, Karnataka. Quantity: {quantity} {unit}. Price: ₹{price} per {unit}. Available from {harvest_date.strftime('%Y-%m-%d')}."
        listing_texts.append(text)

    mandi_prices = []
    mandi_texts = []
    
    for crop in crops:
        category, dists = CROP_MAPPINGS[crop]
        for district in dists:
            rules = CROP_RULES[crop]
            # Simulate real mandi prices
            min_p = round(rules["min_price"] * 0.9, 2)
            max_p = round(rules["max_price"] * 1.1, 2)
            modal_p = round((min_p + max_p) / 2, 2)
            
            mp = MandiPrice(
                cropName=crop,
                state="Karnataka",
                district=district,
                market=f"{district} APMC",
                minPrice=min_p,
                maxPrice=max_p,
                modalPrice=modal_p,
                arrivalDate=datetime.datetime.utcnow()
            )
            mandi_prices.append(mp)
            
            text = f"Mandi Price Reference: {crop} in {district}, Karnataka ({district} APMC market). Min Price: ₹{min_p}, Max Price: ₹{max_p}, Modal (Average) Price: ₹{modal_p}."
            mandi_texts.append(text)

    print("Committing listings and mandi prices to DB without embeddings first...")
    for listing in listings:
        db.add(listing)
    for mp in mandi_prices:
        db.add(mp)
    db.commit()
    
    # Store IDs to fetch them again later
    listing_ids = [l.id for l in listings]
    mandi_ids = [m.id for m in mandi_prices]
    
    # Close session to prevent connection timeout during 3 minute sleep
    db.close()

    print("Generating embeddings and backfilling...")
    all_texts = listing_texts + mandi_texts
    embeddings = generate_embeddings(all_texts)
    
    listing_embeddings = embeddings[:len(listing_ids)]
    mandi_embeddings = embeddings[len(listing_ids):]
    
    # Reopen session and update
    db = SessionLocal()
    for idx, l_id in enumerate(listing_ids):
        l = db.query(Listing).get(l_id)
        if l:
            l.embedding = listing_embeddings[idx]
            
    for idx, m_id in enumerate(mandi_ids):
        m = db.query(MandiPrice).get(m_id)
        if m:
            m.embedding = mandi_embeddings[idx]
        
    print("Committing embeddings...")
    db.commit()

    # 3. Consumers
    print("Creating consumers and orders...")
    consumers = []
    for i in range(5):
        phone = f"88888888{i:02d}"
        consumer = User(
            name=f"Consumer {i+1}",
            phone=phone,
            passwordHash=hashed_pw,
            role=Role.CONSUMER,
        )
        db.add(consumer)
        consumers.append(consumer)
    
    db.commit()

    # Orders
    for _ in range(15):
        consumer = random.choice(consumers)
        listing_id = random.choice(listing_ids)
        listing = db.query(Listing).get(listing_id)
        if not listing:
            continue
        order_qty = round(random.uniform(1, max(2, listing.quantity / 2)), 2)
        total_price = round(order_qty * listing.price, 2)

        order = Order(
            consumerId=consumer.id,
            listingId=listing.id,
            quantity=order_qty,
            totalPrice=total_price,
            status=OrderStatus.PLACED
        )
        db.add(order)
        
    # Force a few orders for lochan farmer
    lochan = db.query(User).filter(User.name == "lochan farmer").first()
    lochan_listings = db.query(Listing).filter(Listing.farmerId == lochan.id).all() if lochan else []
    for listing in lochan_listings[:3]: # Take up to 3 of his listings
        consumer = random.choice(consumers)
        order_qty = round(random.uniform(1, max(2, listing.quantity / 2)), 2)
        total_price = round(order_qty * listing.price, 2)
        order = Order(
            consumerId=consumer.id,
            listingId=listing.id,
            quantity=order_qty,
            totalPrice=total_price,
            status=random.choice([OrderStatus.PLACED, OrderStatus.CONFIRMED])
        )
        db.add(order)

    db.commit()

    # 4. Emergency Requests
    print("Creating emergency requests...")
    needs = ["Food", "Water", "Medical", "Shelter"]
    for i in range(3):
        consumer = random.choice(consumers)
        req = EmergencyRequest(
            consumerId=consumer.id,
            latitude=round(random.uniform(11.5, 18.5), 4), # Karnataka approx latitudes
            longitude=round(random.uniform(74.0, 78.5), 4), # Karnataka approx longitudes
            needType=random.choice(needs),
            status=RequestStatus.OPEN
        )
        db.add(req)
    
    db.commit()

    # 5. Kitchen Partners & Pledges
    print("Creating kitchen partners and pledges...")
    kitchen_user = User(
        name="Community Kitchen",
        phone="7777777700",
        passwordHash=hashed_pw,
        role=Role.KITCHEN_PARTNER,
    )
    db.add(kitchen_user)
    db.commit()
    db.refresh(kitchen_user)
    
    kitchen = KitchenPartner(
        userId=kitchen_user.id,
        kitchenName="Hope Kitchen",
        verificationStatus=True,
        documentUrl="http://example.com/doc.pdf"
    )
    db.add(kitchen)
    db.commit()
    db.refresh(kitchen)
    
    pledge = FoodPledge(
        kitchenId=kitchen.id,
        capacity=500.0,
        status=PledgeStatus.AVAILABLE
    )
    db.add(pledge)
    db.commit()
    
    # 6. Emergency Windows
    print("Creating emergency windows...")
    window = EmergencyWindow(
        district="Bengaluru Urban",
        reason="Severe Flooding",
        status=WindowStatus.ACTIVE
    )
    db.add(window)
    db.commit()
    
    # Re-fetch farmers and consumers
    lochan = db.query(User).filter(User.name == "lochan farmer").first()
    farmer_id = lochan.id if lochan else db.query(User).filter(User.role == Role.FARMER).first().id
    consumer = db.query(User).filter(User.role == Role.CONSUMER).first()

    # 7. Notifications
    print("Creating notifications...")
    notification = Notification(
        userId=farmer_id,
        message="Your listing has been approved and is now live.",
        isRead=False
    )
    db.add(notification)
    db.commit()

    farmer_phone = lochan.phone if lochan else "Unknown"
    consumer_phone = consumer.phone if consumer else "Unknown"

    db.close()

    print("--- Seeding Complete ---")
    print("Sample logins (Password for all: password123)")
    print(f"Farmer: Phone = {farmer_phone}")
    print(f"Consumer: Phone = {consumer_phone}")

def seed_db():
    asyncio.run(seed_db_async())

if __name__ == "__main__":
    seed_db()
