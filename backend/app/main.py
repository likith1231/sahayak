from fastapi import FastAPI, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, listings, orders, emergency, ngo, admin, translate, agent

app = FastAPI(title="Sahayak API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

@app.get("/")
def read_root():
    return {"message": "Sahayak FastAPI Backend"}
