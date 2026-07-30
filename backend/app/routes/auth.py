"""
Authentication routes: login, token issuance.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from app.database import get_db
from app.models.models import User, AuditLog
from app.utils.auth import verify_password, create_access_token, get_current_user
from pydantic import BaseModel

router = APIRouter()


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    role: str
    username: str


@router.post("/token", response_model=TokenResponse)
def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    """Authenticate user and return a JWT bearer token."""
    user = db.query(User).filter(User.username == form_data.username).first()

    if not user or not verify_password(form_data.password, user.password_hash):
        # Log failed attempt
        db.add(AuditLog(
            action="LOGIN_FAILED",
            resource="/api/auth/token",
            ip_address=request.client.host if request.client and request.client.host != "testclient" else None,
            status="denied",
            details={"username": form_data.username},
        ))
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Update last login
    user.last_login = datetime.now(timezone.utc)

    # Log success
    db.add(AuditLog(
        user_id=user.user_id,
        action="LOGIN_SUCCESS",
        resource="/api/auth/token",
        ip_address=request.client.host if request.client and request.client.host != "testclient" else None,
        status="success",
    ))
    db.commit()

    token = create_access_token({"sub": user.username, "role": user.role.role_name})
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        role=user.role.role_name,
        username=user.username,
    )


@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    """Return the currently authenticated user's profile."""
    return {
        "user_id":  current_user.user_id,
        "username": current_user.username,
        "email":    current_user.email,
        "role":     current_user.role.role_name,
    }
