from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User
from app.schemas import UserRegisterReq, UserLoginReq, AuthResponse
from app.auth.password import get_password_hash, verify_password
from app.auth.jwt import create_access_token

router = APIRouter()

@router.post("/api/auth/register", response_model=AuthResponse)
def register(req: UserRegisterReq, db: Session = Depends(get_db)):
    try:
        existing_user = db.query(User).filter(User.phone == req.phone).first()
        if existing_user:
            return JSONResponse(
                status_code=409,
                content={"error": "Phone number already registered"}
            )
            
        if req.email:
            existing_email = db.query(User).filter(User.email == req.email).first()
            if existing_email:
                return JSONResponse(
                    status_code=409,
                    content={"error": "Email already registered"}
                )
            
        password_hash = get_password_hash(req.password)
        
        new_user = User(
            name=req.name,
            phone=req.phone,
            email=req.email,
            passwordHash=password_hash,
            role=req.role
        )
        
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        token = create_access_token(data={"userId": new_user.id, "role": new_user.role.value})
        
        return {
            "token": token,
            "user": {
                "id": new_user.id,
                "name": new_user.name,
                "role": new_user.role
            }
        }
    except Exception as e:
        print(f"Error in register: {e}")
        return JSONResponse(status_code=500, content={"error": "Registration failed"})

@router.post("/api/auth/login", response_model=AuthResponse)
def login(req: UserLoginReq, db: Session = Depends(get_db)):
    try:
        if not req.phone and not req.email:
            return JSONResponse(status_code=400, content={"error": "Must provide either phone or email"})
            
        if req.phone:
            user = db.query(User).filter(User.phone == req.phone).first()
        else:
            user = db.query(User).filter(User.email == req.email).first()
            
        if not user:
            return JSONResponse(status_code=401, content={"error": "Invalid credentials"})
            
        if not verify_password(req.password, user.passwordHash):
            return JSONResponse(status_code=401, content={"error": "Invalid credentials"})
            
        token = create_access_token(data={"userId": user.id, "role": user.role.value})
        
        return {
            "token": token,
            "user": {
                "id": user.id,
                "name": user.name,
                "role": user.role
            }
        }
    except Exception as e:
        print(f"Error in login: {e}")
        return JSONResponse(status_code=500, content={"error": "Login failed"})
