import os
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass


BASE_DIR = Path(__file__).resolve().parent
DATABASE_PATH = BASE_DIR / "history.db"

# Retrieve DATABASE_URL from environment with fallback to SQLite
raw_database_url = os.getenv("DATABASE_URL")

if raw_database_url and raw_database_url.strip():
    DATABASE_URL = raw_database_url.strip()
    # Normalize postgres:// to postgresql:// for SQLAlchemy 1.4+ / 2.0+ compatibility
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
else:
    DATABASE_URL = f"sqlite:///{DATABASE_PATH}"

# Connection arguments: SQLite requires check_same_thread=False
connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True if not DATABASE_URL.startswith("sqlite") else False,
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

Base = declarative_base()