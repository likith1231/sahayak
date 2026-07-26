from fastapi import FastAPI, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, listings, orders, emergency, ngo, admin, translate, agent, cart, checkout, notifications, mandis
from app.services.agmarknet import sync_prices
from app.services.weather import check_weather_alerts
from app.database import SessionLocal
from apscheduler.schedulers.asyncio import AsyncIOScheduler
import contextlib

app = FastAPI(title="Sahayak API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

async def agmarknet_job():
    db = SessionLocal()
    try:
        await sync_prices(db)
    finally:
        db.close()

async def weather_job():
    db = SessionLocal()
    try:
        check_weather_alerts(db)
    finally:
        db.close()

scheduler = AsyncIOScheduler()

@app.on_event("startup")
async def startup_event():
    scheduler.add_job(agmarknet_job, "cron", hour=0) # Run daily at midnight
    scheduler.add_job(weather_job, "interval", hours=3) # Run every 3 hours
    scheduler.start()
    
@app.on_event("shutdown")
async def shutdown_event():
    scheduler.shutdown()

@app.exception_handler(HTTPException)
async def custom_http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail}
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    return JSONResponse(
        status_code=400,
        content={"error": "Missing required fields"}
    )

app.include_router(auth.router)
app.include_router(listings.router)
app.include_router(orders.router)
app.include_router(emergency.router)
app.include_router(ngo.router)
app.include_router(admin.router)
app.include_router(translate.router)
app.include_router(agent.router)
app.include_router(cart.router)
app.include_router(checkout.router)
app.include_router(notifications.router)
app.include_router(mandis.router)

@app.get("/")
def read_root():
    return {"message": "Sahayak FastAPI Backend"}
