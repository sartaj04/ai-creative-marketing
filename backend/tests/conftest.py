"""
Test fixtures for Pixo backend tests.
"""
import asyncio
import pytest
import pytest_asyncio
from typing import AsyncGenerator, Generator
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database import Base, get_db
from app.config import settings
from app.models.user import User, UserTier, UserSegment
from app.core.security import get_password_hash
from app.core.auth import create_access_token


# Test database URL
TEST_DATABASE_URL = "sqlite+aiosqlite:///./test.db"


@pytest.fixture(scope="session")
def event_loop() -> Generator:
    """Create event loop for async tests."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="function")
async def test_db() -> AsyncGenerator[AsyncSession, None]:
    """Create a fresh database for each test."""
    engine = create_async_engine(
        TEST_DATABASE_URL,
        echo=False,
    )
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async_session = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    
    async with async_session() as session:
        yield session
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    
    await engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def client(test_db: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Create test client with overridden database."""
    
    async def override_get_db():
        yield test_db
    
    app.dependency_overrides[get_db] = override_get_db
    
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    
    app.dependency_overrides.clear()


@pytest_asyncio.fixture(scope="function")
async def test_user(test_db: AsyncSession) -> User:
    """Create a test user."""
    user = User(
        email="test@pixo.ai",
        password_hash=get_password_hash("TestPassword123"),
        full_name="Test User",
        tier=UserTier.STARTER,
        segment=UserSegment.ECOMMERCE,
        usage_count=0
    )
    test_db.add(user)
    await test_db.commit()
    await test_db.refresh(user)
    return user


@pytest_asyncio.fixture(scope="function")
async def auth_headers(test_user: User) -> dict:
    """Get authentication headers for test user."""
    token = create_access_token(
        data={"sub": str(test_user.id)},
        expires_delta=None
    )
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture(scope="function")
async def pro_user(test_db: AsyncSession) -> User:
    """Create a Pro tier test user."""
    user = User(
        email="pro@pixo.ai",
        password_hash=get_password_hash("ProPassword123"),
        full_name="Pro User",
        tier=UserTier.PRO,
        segment=UserSegment.SAAS,
        usage_count=50
    )
    test_db.add(user)
    await test_db.commit()
    await test_db.refresh(user)
    return user


@pytest_asyncio.fixture(scope="function")
async def pro_auth_headers(pro_user: User) -> dict:
    """Get authentication headers for pro user."""
    token = create_access_token(
        data={"sub": str(pro_user.id)},
        expires_delta=None
    )
    return {"Authorization": f"Bearer {token}"}
