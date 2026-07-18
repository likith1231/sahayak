import os
from datetime import datetime, timedelta
from jose import jwt
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.getenv("JWT_SECRET")
ALGORITHM = "HS256"
# Keep standard expiration though not strictly required if not used previously
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7 # 7 days

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt
