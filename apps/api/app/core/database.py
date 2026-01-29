"""Database configuration with async SQLAlchemy."""
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings


class Base(DeclarativeBase):
    """Base class for all database models."""
    pass


# Create async engine
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,  # Set to False in production for better performance
    pool_pre_ping=True,  # Verify connections before using
    pool_size=10,  # Increased from 5 for better concurrency
    max_overflow=20,  # Increased from 10 for peak loads
    pool_recycle=3600,  # Recycle connections after 1 hour
    connect_args={
        "server_settings": {
            "application_name": "pixo_api",
            "jit": "off",  # Disable JIT for faster queries
        }
    },
)

# Create async session factory
async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency to get database session."""
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db() -> None:
    """Initialize database tables."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
