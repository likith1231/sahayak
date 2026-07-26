from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import DistributionCenter
from app.schemas import DistributionCenterResponse

router = APIRouter(prefix="/api/mandis", tags=["mandis"])

@router.get("", response_model=List[DistributionCenterResponse])
def get_all_mandis(db: Session = Depends(get_db)):
    centers = db.query(DistributionCenter).order_by(DistributionCenter.district, DistributionCenter.name).all()
    return centers

@router.get("/{mandi_id}", response_model=DistributionCenterResponse)
def get_mandi(mandi_id: str, db: Session = Depends(get_db)):
    from fastapi import HTTPException
    mandi = db.query(DistributionCenter).filter(DistributionCenter.id == mandi_id).first()
    if not mandi:
        raise HTTPException(status_code=404, detail="Mandi not found")
    return mandi
