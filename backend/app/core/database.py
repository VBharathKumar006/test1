"""SQLite database setup using SQLAlchemy async."""
import logging
import os
from pathlib import Path
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.core.config import settings

logger = logging.getLogger(__name__)

# Ensure data directory exists
os.makedirs(os.path.dirname(settings.DB_PATH), exist_ok=True)

# Normalize Windows path for SQLite URL
db_file = Path(settings.DB_PATH).as_posix()
DATABASE_URL = f"sqlite+aiosqlite:///{db_file}"

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    connect_args={"check_same_thread": False},
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def init_db():
    """Create all tables on startup."""
    from app.models import document_models  # noqa: F401 — triggers model registration
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables created/verified.")


async def get_db():
    """Dependency: yield an async DB session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
