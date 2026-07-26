from app.database import engine; from sqlalchemy import text; conn = engine.connect(); print("Connected!"); conn.close()
