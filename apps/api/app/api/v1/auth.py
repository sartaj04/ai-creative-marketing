"""Authentication endpoints."""
import logging
from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select, update

from app.api.deps import CurrentUser, DBSession
from app.core.security import create_access_token, get_password_hash, verify_password
from app.models.user import User
from app.models.profile_member import ProfileMember, MemberStatus
from app.schemas.auth import Token, UserCreate, UserLogin, UserResponse

logger = logging.getLogger(__name__)

router = APIRouter()


async def _claim_pending_invitations(user_id, email: str, db) -> None:
    """Link pending invitations sent to this email to the user.

    Does NOT auto-accept — user must explicitly accept each invitation.
    """
    try:
        await db.execute(
            update(ProfileMember)
            .where(
                ProfileMember.invited_email == email.lower(),
                ProfileMember.status == MemberStatus.PENDING,
                ProfileMember.user_id.is_(None),
            )
            .values(user_id=user_id)
        )
    except Exception as e:
        logger.warning(f"Failed to claim invitations for {email}: {e}")


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate, db: DBSession) -> Token:
    """Register a new user."""
    # Check if user exists
    result = await db.execute(select(User).where(User.email == user_data.email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    # Create user
    user = User(
        email=user_data.email,
        hashed_password=get_password_hash(user_data.password),
        name=user_data.name,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    # Claim any pending invitations sent to this email
    await _claim_pending_invitations(user.id, user.email, db)
    await db.commit()

    # Generate token
    access_token = create_access_token(subject=str(user.id))

    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@router.post("/login", response_model=Token)
async def login(login_data: UserLogin, db: DBSession) -> Token:
    """Login user and return JWT token."""
    result = await db.execute(select(User).where(User.email == login_data.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )

    # Claim any pending invitations sent to this email
    await _claim_pending_invitations(user.id, user.email, db)
    await db.commit()

    access_token = create_access_token(subject=str(user.id))

    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@router.post("/logout")
async def logout(current_user: CurrentUser) -> dict:
    """Logout user (client should discard token)."""
    # In a real app, you might want to blacklist the token
    return {"message": "Successfully logged out"}


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: CurrentUser) -> UserResponse:
    """Get current user information."""
    return UserResponse.model_validate(current_user)


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_current_user(current_user: CurrentUser, db: DBSession) -> None:
    """Delete current user and all associated data."""
    await db.delete(current_user)
    await db.commit()
