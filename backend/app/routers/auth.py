from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.models import User, SavedMandi, DistributionCenter
from app.schemas import UserRegisterReq, UserLoginReq, AuthResponse, UserUpdateReq, UserResponse, PasswordUpdateReq, SavedMandiCreateReq
from app.auth.password import get_password_hash, verify_password
from app.auth.jwt import create_access_token
from app.auth.dependencies import get_current_user

router = APIRouter()

@router.post("/api/auth/register", response_model=AuthResponse)
def register(req: UserRegisterReq, db: Session = Depends(get_db)):
    try:
        existing_user = None # Removed uniqueness check for phone to allow multiple registrations
        if req.email:
            existing_email = db.query(User).filter(User.email == req.email).first()
            if existing_email:
                return JSONResponse(
                    status_code=409,
                    content={"detail": "Email already registered"}
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
            "user": new_user
        }
    except Exception as e:
        print(f"Error in register: {e}")
        return JSONResponse(status_code=500, content={"detail": "Registration failed. Please try again."})

@router.post("/api/auth/login", response_model=AuthResponse)
def login(req: UserLoginReq, db: Session = Depends(get_db)):
    try:
        if not req.phone and not req.email:
            return JSONResponse(status_code=400, content={"detail": "Must provide either phone or email"})
            
        if req.phone:
            user = db.query(User).filter(User.phone == req.phone).first()
        else:
            user = db.query(User).filter(User.email == req.email).first()
            
        if not user:
            return JSONResponse(status_code=401, content={"detail": "Invalid credentials"})
            
        if not verify_password(req.password, user.passwordHash):
            return JSONResponse(status_code=401, content={"detail": "Invalid credentials"})
            
        token = create_access_token(data={"userId": user.id, "role": user.role.value})
        
        return {
            "token": token,
            "user": user
        }
    except Exception as e:
        print(f"Error in login: {e}")
        return JSONResponse(status_code=500, content={"detail": "Login failed"})

@router.get("/api/auth/me", response_model=UserResponse)
def get_profile(db: Session = Depends(get_db), payload: dict = Depends(get_current_user)):
    try:
        user = db.query(User).options(
            joinedload(User.savedMandis).joinedload(SavedMandi.mandi),
            joinedload(User.assignedMandi)
        ).filter(User.id == payload["userId"]).first()
        
        if not user:
            return JSONResponse(status_code=404, content={"detail": "User not found"})
            
        return user
    except Exception as e:
        print(f"Error fetching profile: {e}")
        return JSONResponse(status_code=500, content={"detail": "Failed to fetch profile"})

@router.patch("/api/auth/me", response_model=UserResponse)
def update_profile(req: UserUpdateReq, db: Session = Depends(get_db), payload: dict = Depends(get_current_user)):
    try:
        user = db.query(User).filter(User.id == payload["userId"]).first()
        if not user:
            return JSONResponse(status_code=404, content={"detail": "User not found"})
            
        if req.name is not None:
            user.name = req.name
            
        if req.email is not None:
            if req.email != user.email:
                existing = db.query(User).filter(User.email == req.email).first()
                if existing:
                    return JSONResponse(status_code=409, content={"detail": "Email already in use"})
            user.email = req.email
            
        if req.location is not None:
            user.location = req.location
            
        db.commit()
        
        # Reload with relationships
        user = db.query(User).options(
            joinedload(User.savedMandis).joinedload(SavedMandi.mandi),
            joinedload(User.assignedMandi)
        ).filter(User.id == payload["userId"]).first()
        
        return user
    except Exception as e:
        print(f"Error updating profile: {e}")
        return JSONResponse(status_code=500, content={"detail": "Update failed"})

@router.patch("/api/auth/password")
def update_password(req: PasswordUpdateReq, db: Session = Depends(get_db), payload: dict = Depends(get_current_user)):
    try:
        user = db.query(User).filter(User.id == payload["userId"]).first()
        if not user:
            return JSONResponse(status_code=404, content={"detail": "User not found"})
            
        if not verify_password(req.currentPassword, user.passwordHash):
            return JSONResponse(status_code=401, content={"detail": "Incorrect current password"})
            
        user.passwordHash = get_password_hash(req.newPassword)
        db.commit()
        return {"message": "Password updated successfully"}
    except Exception as e:
        print(f"Error updating password: {e}")
        return JSONResponse(status_code=500, content={"detail": "Failed to update password"})

@router.post("/api/auth/saved-mandis")
def add_saved_mandi(req: SavedMandiCreateReq, db: Session = Depends(get_db), payload: dict = Depends(get_current_user)):
    try:
        # Check if already saved
        existing = db.query(SavedMandi).filter(SavedMandi.userId == payload["userId"], SavedMandi.mandiId == req.mandiId).first()
        if existing:
            return JSONResponse(status_code=400, content={"detail": "Mandi already saved"})
            
        new_saved = SavedMandi(
            userId=payload["userId"],
            mandiId=req.mandiId
        )
        db.add(new_saved)
        db.commit()
        return {"message": "Distribution center saved"}
    except Exception as e:
        print(f"Error saving mandi: {e}")
        db.rollback()
        return JSONResponse(status_code=500, content={"detail": "Failed to save distribution center"})

@router.delete("/api/auth/saved-mandis/{mandi_id}")
def remove_saved_mandi(mandi_id: str, db: Session = Depends(get_db), payload: dict = Depends(get_current_user)):
    try:
        saved = db.query(SavedMandi).filter(SavedMandi.userId == payload["userId"], SavedMandi.mandiId == mandi_id).first()
        if not saved:
            return JSONResponse(status_code=404, content={"detail": "Saved mandi not found"})
            
        db.delete(saved)
        db.commit()
        return {"message": "Distribution center removed from saved"}
    except Exception as e:
        print(f"Error removing mandi: {e}")
        db.rollback()
        return JSONResponse(status_code=500, content={"detail": "Failed to remove distribution center"})
