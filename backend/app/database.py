import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from dotenv import load_dotenv

load_dotenv()

# Extract DATABASE_URL
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")
if SQLALCHEMY_DATABASE_URL and SQLALCHEMY_DATABASE_URL.startswith("postgresql://") and "?" in SQLALCHEMY_DATABASE_URL:
    # psycopg2 might have issues with some Prisma-specific query params like channel_binding
    # but we'll try as-is first. If there are issues, we can strip them later.
    pass

engine = create_engine(SQLALCHEMY_DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
