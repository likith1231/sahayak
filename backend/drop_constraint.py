from app.database import engine
from sqlalchemy import text
with engine.connect() as conn:
    conn.execute(text('ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_phone_key"'))
    conn.commit()
print("Dropped")
