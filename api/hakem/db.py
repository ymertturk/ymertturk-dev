from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

import os
import sys

# Get DATABASE_URL from environment variables (Render provides this)
DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL:
    # Render uses "postgres://" but SQLAlchemy needs "postgresql://"
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
        
    engine = create_engine(DATABASE_URL)
else:
    # Local SQLite fallback
    if getattr(sys, 'frozen', False):
        # Running as compiled exe
        BASE_DIR = os.path.dirname(sys.executable)
    else:
        # Running as script
        BASE_DIR = os.path.dirname(os.path.abspath(__file__))

    SQLALCHEMY_DATABASE_URL = f"sqlite:///{os.path.join(BASE_DIR, 'referee_tracker.db')}"

    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
    )
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
