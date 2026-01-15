"""
Tests for authentication API endpoints.
"""
import pytest
from httpx import AsyncClient


class TestAuthRegister:
    """Test user registration endpoint."""
    
    async def test_register_success(self, client: AsyncClient):
        """Test successful user registration."""
        response = await client.post(
            "/api/v1/auth/register",
            json={
                "email": "newuser@pixo.ai",
                "password": "SecurePass123!",
                "full_name": "New User",
                "segment": "ecommerce"
            }
        )
        
        assert response.status_code == 201
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["email"] == "newuser@pixo.ai"
    
    async def test_register_duplicate_email(self, client: AsyncClient, test_user):
        """Test registration with existing email fails."""
        response = await client.post(
            "/api/v1/auth/register",
            json={
                "email": test_user.email,
                "password": "AnotherPass123!",
            }
        )
        
        assert response.status_code == 400
        assert "already registered" in response.json()["detail"]
    
    async def test_register_invalid_email(self, client: AsyncClient):
        """Test registration with invalid email format."""
        response = await client.post(
            "/api/v1/auth/register",
            json={
                "email": "invalid-email",
                "password": "SecurePass123!"
            }
        )
        
        assert response.status_code == 422
    
    async def test_register_weak_password(self, client: AsyncClient):
        """Test registration with weak password."""
        response = await client.post(
            "/api/v1/auth/register",
            json={
                "email": "weak@pixo.ai",
                "password": "123"
            }
        )
        
        assert response.status_code == 422


class TestAuthLogin:
    """Test user login endpoint."""
    
    async def test_login_success(self, client: AsyncClient, test_user):
        """Test successful login."""
        response = await client.post(
            "/api/v1/auth/login",
            json={
                "email": test_user.email,
                "password": "TestPassword123"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
    
    async def test_login_invalid_password(self, client: AsyncClient, test_user):
        """Test login with wrong password."""
        response = await client.post(
            "/api/v1/auth/login",
            json={
                "email": test_user.email,
                "password": "WrongPassword123"
            }
        )
        
        assert response.status_code == 401
    
    async def test_login_nonexistent_user(self, client: AsyncClient):
        """Test login with non-existent email."""
        response = await client.post(
            "/api/v1/auth/login",
            json={
                "email": "notexist@pixo.ai",
                "password": "SomePassword123"
            }
        )
        
        assert response.status_code == 401


class TestAuthMe:
    """Test current user endpoint."""
    
    async def test_get_current_user(self, client: AsyncClient, test_user, auth_headers):
        """Test getting current user info."""
        response = await client.get(
            "/api/v1/auth/me",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == test_user.email
        assert data["tier"] == "starter"
    
    async def test_get_current_user_no_auth(self, client: AsyncClient):
        """Test accessing without authentication."""
        response = await client.get("/api/v1/auth/me")
        
        assert response.status_code == 401
    
    async def test_get_current_user_invalid_token(self, client: AsyncClient):
        """Test with invalid token."""
        response = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": "Bearer invalid-token"}
        )
        
        assert response.status_code == 401
