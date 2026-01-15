"""
Tests for brand profile API endpoints.
"""
import pytest
from httpx import AsyncClient
from uuid import uuid4

from app.models.brand_profile import BrandProfile, ProfileType


class TestBrandProfileCreate:
    """Test brand profile creation."""
    
    async def test_create_brand_success(self, client: AsyncClient, auth_headers):
        """Test successful brand profile creation."""
        response = await client.post(
            "/api/v1/brands",
            headers=auth_headers,
            json={
                "name": "Test Brand",
                "website_url": "https://testbrand.com",
                "profile_type": "ecommerce",
                "description": "A test e-commerce brand"
            }
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Test Brand"
        assert data["website_url"] == "https://testbrand.com"
        assert data["profile_type"] == "ecommerce"
    
    async def test_create_brand_no_auth(self, client: AsyncClient):
        """Test creation without authentication fails."""
        response = await client.post(
            "/api/v1/brands",
            json={
                "name": "Unauthorized Brand",
                "website_url": "https://unauthorized.com",
                "profile_type": "saas"
            }
        )
        
        assert response.status_code == 401
    
    async def test_create_brand_invalid_url(self, client: AsyncClient, auth_headers):
        """Test creation with invalid URL."""
        response = await client.post(
            "/api/v1/brands",
            headers=auth_headers,
            json={
                "name": "Invalid URL Brand",
                "website_url": "not-a-valid-url",
                "profile_type": "ecommerce"
            }
        )
        
        assert response.status_code == 422


class TestBrandProfileList:
    """Test brand profile listing."""
    
    async def test_list_empty(self, client: AsyncClient, auth_headers):
        """Test listing with no brands."""
        response = await client.get(
            "/api/v1/brands",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        assert response.json() == []
    
    async def test_list_with_brands(self, client: AsyncClient, auth_headers, test_db, test_user):
        """Test listing with existing brands."""
        # Create test brands
        for i in range(3):
            brand = BrandProfile(
                user_id=test_user.id,
                name=f"Brand {i}",
                website_url=f"https://brand{i}.com",
                profile_type=ProfileType.ECOMMERCE
            )
            test_db.add(brand)
        await test_db.commit()
        
        response = await client.get(
            "/api/v1/brands",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 3


class TestBrandProfileGet:
    """Test brand profile retrieval."""
    
    async def test_get_brand_success(self, client: AsyncClient, auth_headers, test_db, test_user):
        """Test getting existing brand."""
        brand = BrandProfile(
            user_id=test_user.id,
            name="Get Test Brand",
            website_url="https://gettest.com",
            profile_type=ProfileType.SAAS
        )
        test_db.add(brand)
        await test_db.commit()
        await test_db.refresh(brand)
        
        response = await client.get(
            f"/api/v1/brands/{brand.id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        assert response.json()["name"] == "Get Test Brand"
    
    async def test_get_brand_not_found(self, client: AsyncClient, auth_headers):
        """Test getting non-existent brand."""
        fake_id = uuid4()
        response = await client.get(
            f"/api/v1/brands/{fake_id}",
            headers=auth_headers
        )
        
        assert response.status_code == 404
    
    async def test_get_other_user_brand(self, client: AsyncClient, auth_headers, test_db, pro_user):
        """Test getting another user's brand fails."""
        # Create brand for different user
        brand = BrandProfile(
            user_id=pro_user.id,
            name="Other User Brand",
            website_url="https://other.com",
            profile_type=ProfileType.PERSONAL
        )
        test_db.add(brand)
        await test_db.commit()
        await test_db.refresh(brand)
        
        response = await client.get(
            f"/api/v1/brands/{brand.id}",
            headers=auth_headers
        )
        
        assert response.status_code == 404


class TestBrandProfileDelete:
    """Test brand profile deletion."""
    
    async def test_delete_brand_success(self, client: AsyncClient, auth_headers, test_db, test_user):
        """Test successful deletion."""
        brand = BrandProfile(
            user_id=test_user.id,
            name="Delete Me Brand",
            website_url="https://deleteme.com",
            profile_type=ProfileType.ECOMMERCE
        )
        test_db.add(brand)
        await test_db.commit()
        await test_db.refresh(brand)
        
        response = await client.delete(
            f"/api/v1/brands/{brand.id}",
            headers=auth_headers
        )
        
        assert response.status_code == 204
