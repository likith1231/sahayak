from fastapi import Depends, HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from app.auth.jwt import SECRET_KEY, ALGORITHM

security = HTTPBearer(auto_error=False)

from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security),
    db: Session = Depends(get_db)
):
    if not credentials:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("userId")
        
        # Verify user still exists in DB
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=401, detail="User no longer exists. Please log out and log in again.")
            
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

def get_current_farmer(payload: dict = Depends(get_current_user)):
    if payload.get("role") != "FARMER":
        raise HTTPException(status_code=403, detail="Only farmers can create listings")
    return payload

def get_current_consumer(payload: dict = Depends(get_current_user)):
    if payload.get("role") != "CONSUMER":
        raise HTTPException(status_code=403, detail="Only consumers can place orders")
    return payload

def get_current_ngo(payload: dict = Depends(get_current_user)):
    if payload.get("role") != "NGO":
        raise HTTPException(status_code=403, detail="Only NGOs can perform this action")
    return payload

def get_current_admin(payload: dict = Depends(get_current_user)):
    if payload.get("role") != "ADMIN":
        raise HTTPException(status_code=403, detail="Only admins can perform this action")
    return payload
