import base64

import pyotp
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from jose import JWTError
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.core.crypto import generate_salt
from app.core.email_otp import create_and_send_code, verify_code
from app.core.security import create_access_token, create_preauth_token, decode_token, hash_password, verify_password
from app.database import get_db
from app.models import User
from app.api.v1.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginResponse(BaseModel):
    access_token: str | None = None
    token_type: str = "bearer"
    otp_required: bool = False
    methods: list[str] = []
    preauth_token: str | None = None


class OTPLoginVerify(BaseModel):
    preauth_token: str
    method: str  # "totp" or "email"
    code: str


class OTPLoginResend(BaseModel):
    preauth_token: str


def _resolve_preauth_user(preauth_token: str, db: Session) -> User:
    try:
        payload = decode_token(preauth_token)
        if payload.get("typ") != "preauth":
            raise ValueError
        user_id = int(payload["sub"])
    except (JWTError, ValueError, KeyError):
        raise HTTPException(status_code=401, detail="Session expired, please log in again")
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=401, detail="Session expired, please log in again")
    return user


class UserResponse(BaseModel):
    id: int
    email: str
    totp_enabled: bool
    email_otp_enabled: bool

    model_config = {"from_attributes": True}


@router.post("/register", response_model=UserResponse, status_code=201)
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    salt = generate_salt()
    user = User(
        email=body.email,
        hashed_password=hash_password(body.password),
        salt=base64.b64encode(salt).decode(),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/token", response_model=LoginResponse)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form.username).first()
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if not user.totp_enabled and not user.email_otp_enabled:
        token = create_access_token({"sub": str(user.id)})
        return {"access_token": token}

    methods = []
    if user.totp_enabled:
        methods.append("totp")
    if user.email_otp_enabled:
        methods.append("email")
        create_and_send_code(db, user, "login")

    preauth_token = create_preauth_token({"sub": str(user.id)})
    return {"otp_required": True, "methods": methods, "preauth_token": preauth_token}


@router.post("/otp/verify", response_model=TokenResponse)
def login_otp_verify(body: OTPLoginVerify, db: Session = Depends(get_db)):
    user = _resolve_preauth_user(body.preauth_token, db)

    if body.method == "totp":
        if not user.totp_enabled or not pyotp.TOTP(user.totp_secret).verify(body.code):
            raise HTTPException(status_code=400, detail="Invalid code")
    elif body.method == "email":
        if not user.email_otp_enabled or not verify_code(db, user, "login", body.code):
            raise HTTPException(status_code=400, detail="Invalid or expired code")
    else:
        raise HTTPException(status_code=400, detail="Unknown method")

    token = create_access_token({"sub": str(user.id)})
    return {"access_token": token}


@router.post("/otp/resend")
def login_otp_resend(body: OTPLoginResend, db: Session = Depends(get_db)):
    user = _resolve_preauth_user(body.preauth_token, db)
    if not user.email_otp_enabled:
        raise HTTPException(status_code=400, detail="Email OTP not enabled for this account")
    create_and_send_code(db, user, "login")
    return {"sent": True}


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    return current_user
