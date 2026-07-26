from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Notification
from app.auth.dependencies import get_current_user

router = APIRouter()

@router.get("/api/notifications")
def get_notifications(db: Session = Depends(get_db), payload: dict = Depends(get_current_user)):
    try:
        notifications = db.query(Notification).filter(Notification.userId == payload["userId"]).order_by(Notification.createdAt.desc()).all()
        return {
            "notifications": [
                {
                    "id": n.id,
                    "message": n.message,
                    "isRead": n.isRead,
                    "createdAt": n.createdAt.isoformat()
                } for n in notifications
            ]
        }
    except Exception as e:
        print(e)
        return JSONResponse(status_code=500, content={"error": "Failed to fetch notifications"})

@router.patch("/api/notifications/{id}/read")
def mark_notification_read(id: str, db: Session = Depends(get_db), payload: dict = Depends(get_current_user)):
    try:
        notification = db.query(Notification).filter(Notification.id == id, Notification.userId == payload["userId"]).first()
        if not notification:
            return JSONResponse(status_code=404, content={"error": "Notification not found"})
        
        notification.isRead = True
        db.commit()
        return {"message": "Notification marked as read"}
    except Exception as e:
        print(e)
        db.rollback()
        return JSONResponse(status_code=500, content={"error": "Failed to mark notification as read"})
