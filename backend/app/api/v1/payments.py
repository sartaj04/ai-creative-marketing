"""
Razorpay payments API endpoints.
"""
from uuid import UUID
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
import razorpay
import hmac
import hashlib

from app.database import get_db
from app.models.user import User, UserTier
from app.core.auth import get_current_user
from app.config import settings


router = APIRouter()


# Initialize Razorpay client
razorpay_client = razorpay.Client(
    auth=(settings.razorpay_key_id, settings.razorpay_key_secret)
) if settings.razorpay_key_id and settings.razorpay_key_secret else None


class CreateOrderRequest(BaseModel):
    """Request for creating a payment order."""
    plan: str  # "starter" or "pro"


class CreateOrderResponse(BaseModel):
    """Response with Razorpay order details."""
    order_id: str
    amount: int
    currency: str
    key_id: str


class VerifyPaymentRequest(BaseModel):
    """Request for verifying payment."""
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


# Pricing in paise (1 INR = 100 paise)
PRICING = {
    "starter": {
        "amount": 49900,  # ₹499
        "tier": UserTier.STARTER
    },
    "pro": {
        "amount": 149900,  # ₹1,499
        "tier": UserTier.PRO
    }
}


@router.get("/plans")
async def get_pricing_plans():
    """
    Get available pricing plans.
    """
    return {
        "plans": [
            {
                "id": "free",
                "name": "Free",
                "price": 0,
                "currency": "INR",
                "generations_per_month": 10,
                "features": [
                    "5 Basic Templates",
                    "1 Brand Profile",
                    "Standard Support"
                ]
            },
            {
                "id": "starter",
                "name": "Starter",
                "price": 499,
                "currency": "INR",
                "generations_per_month": 100,
                "features": [
                    "All Templates",
                    "5 Brand Profiles",
                    "Priority Support",
                    "Multi-language Copy"
                ]
            },
            {
                "id": "pro",
                "name": "Pro",
                "price": 1499,
                "currency": "INR",
                "generations_per_month": -1,  # Unlimited
                "features": [
                    "All Templates",
                    "Unlimited Brand Profiles",
                    "Priority Support",
                    "Multi-language Copy",
                    "API Access",
                    "Custom Templates"
                ]
            }
        ]
    }


@router.post("/create-order", response_model=CreateOrderResponse)
async def create_order(
    request: CreateOrderRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a Razorpay order for subscription.
    """
    if not razorpay_client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Payment service not configured"
        )
    
    if request.plan not in PRICING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid plan"
        )
    
    plan = PRICING[request.plan]
    
    # Create Razorpay order
    try:
        order = razorpay_client.order.create({
            "amount": plan["amount"],
            "currency": "INR",
            "receipt": f"user_{current_user.id}_{request.plan}",
            "notes": {
                "user_id": str(current_user.id),
                "plan": request.plan
            }
        })
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create order: {str(e)}"
        )
    
    return CreateOrderResponse(
        order_id=order["id"],
        amount=plan["amount"],
        currency="INR",
        key_id=settings.razorpay_key_id
    )


@router.post("/verify")
async def verify_payment(
    payment: VerifyPaymentRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Verify Razorpay payment signature and activate subscription.
    """
    if not razorpay_client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Payment service not configured"
        )
    
    # Verify signature
    try:
        # Create signature verification string
        body = f"{payment.razorpay_order_id}|{payment.razorpay_payment_id}"
        expected_signature = hmac.new(
            settings.razorpay_key_secret.encode(),
            body.encode(),
            hashlib.sha256
        ).hexdigest()
        
        if expected_signature != payment.razorpay_signature:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid payment signature"
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Signature verification failed: {str(e)}"
        )
    
    # Get order details to determine plan
    try:
        order = razorpay_client.order.fetch(payment.razorpay_order_id)
        plan_name = order.get("notes", {}).get("plan", "starter")
        
        if plan_name in PRICING:
            current_user.tier = PRICING[plan_name]["tier"]
            current_user.usage_count = 0  # Reset usage on upgrade
            await db.commit()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process payment: {str(e)}"
        )
    
    return {
        "success": True,
        "message": "Payment verified and subscription activated",
        "tier": current_user.tier.value
    }


@router.post("/webhook")
async def razorpay_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Handle Razorpay webhooks for payment events.
    """
    if not razorpay_client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Payment service not configured"
        )
    
    # Get webhook signature
    signature = request.headers.get("X-Razorpay-Signature")
    if not signature:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing webhook signature"
        )
    
    # Get request body
    body = await request.body()
    
    # Verify webhook signature
    try:
        razorpay_client.utility.verify_webhook_signature(
            body.decode(),
            signature,
            settings.razorpay_key_secret
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid webhook signature"
        )
    
    # Process webhook event
    payload = await request.json()
    event = payload.get("event")
    
    # Handle different events
    if event == "payment.captured":
        # Payment successful
        pass
    elif event == "payment.failed":
        # Payment failed
        pass
    elif event == "subscription.cancelled":
        # Subscription cancelled - downgrade user
        pass
    
    return {"status": "ok"}
