import random
from sqlalchemy.orm import Session
from app.models import EmergencyWindow, WindowStatus

def check_weather_alerts(db: Session):
    """
    Mock checking for severe weather alerts via OpenWeatherMap API.
    If a severe alert is found (simulated with random chance), it creates an EmergencyWindow.
    """
    districts = ["Bangalore", "Mysore", "Hubli", "Mangalore", "Belgaum"]
    
    # Simulate a 10% chance of a severe weather alert in a random district
    if random.random() < 0.1:
        affected_district = random.choice(districts)
        reasons = ["Heavy Rainfall & Flooding Risk", "Cyclone Warning", "Severe Heatwave"]
        reason = random.choice(reasons)
        
        # Check if an active window already exists for this district
        existing = db.query(EmergencyWindow).filter(
            EmergencyWindow.district == affected_district,
            EmergencyWindow.status.in_([WindowStatus.ACTIVE, WindowStatus.PENDING_CONFIRMATION])
        ).first()
        
        if not existing:
            new_window = EmergencyWindow(
                district=affected_district,
                reason=reason,
                status=WindowStatus.PENDING_CONFIRMATION
            )
            db.add(new_window)
            db.commit()
            print(f"Weather Alert triggered an Emergency Window for {affected_district}")
