"""
BrandScale AI - Authentication Tests
"""
import pytest
from httpx import AsyncClient


class TestAuthEndpoints:
    """Test authentication endpoints."""
    
    @pytest.mark.asyncio
    async def test_register_success(self, client: AsyncClient, sample_user_data):
        """Test successful user registration."""
        response = await client.post("/api/auth/register", json=sample_user_data)
        
        assert response.status_code == 201
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["email"] == sample_user_data["email"]
        assert data["user"]["tier"] == "free"
    
    @pytest.mark.asyncio
    async def test_register_duplicate_email(self, client: AsyncClient, sample_user_data):
        """Test registration with duplicate email fails."""
        # First registration
        await client.post("/api/auth/register", json=sample_user_data)
        
        # Duplicate registration
        response = await client.post("/api/auth/register", json=sample_user_data)
        
        assert response.status_code == 400
        assert "already registered" in response.json()["message"].lower()
    
    @pytest.mark.asyncio
    async def test_register_weak_password(self, client: AsyncClient):
        """Test registration with weak password fails."""
        response = await client.post("/api/auth/register", json={
            "email": "test@example.com",
            "password": "weak",
        })
        
        assert response.status_code == 422  # Validation error
    
    @pytest.mark.asyncio
    async def test_login_success(self, client: AsyncClient, sample_user_data):
        """Test successful login."""
        # Register first
        await client.post("/api/auth/register", json=sample_user_data)
        
        # Login
        response = await client.post("/api/auth/login", json={
            "email": sample_user_data["email"],
            "password": sample_user_data["password"],
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
    
    @pytest.mark.asyncio
    async def test_login_wrong_password(self, client: AsyncClient, sample_user_data):
        """Test login with wrong password fails."""
        # Register first
        await client.post("/api/auth/register", json=sample_user_data)
        
        # Login with wrong password
        response = await client.post("/api/auth/login", json={
            "email": sample_user_data["email"],
            "password": "WrongPass123!",
        })
        
        assert response.status_code == 401
    
    @pytest.mark.asyncio
    async def test_get_me_authenticated(self, client: AsyncClient, sample_user_data):
        """Test getting current user when authenticated."""
        # Register and get token
        register_response = await client.post("/api/auth/register", json=sample_user_data)
        token = register_response.json()["access_token"]
        
        # Get current user
        response = await client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        assert response.json()["email"] == sample_user_data["email"]
    
    @pytest.mark.asyncio
    async def test_get_me_unauthenticated(self, client: AsyncClient):
        """Test getting current user without token fails."""
        response = await client.get("/api/auth/me")
        
        assert response.status_code == 403  # No authorization header
