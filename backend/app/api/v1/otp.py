import io
import pyotp
import qrcode
import base64

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.v1.deps import get_current_user
from app.core.email_otp import create_and_send_code, verify_code
from app.database import get_db
from app.models import User

router = APIRouter(prefix="/otp", tags=["otp"])


class OTPVerify(BaseModel):
    code: str


class OTPStatus(BaseModel):
    enabled: bool
    email_enabled: bool
    provisioning_uri: str | None = None


class EmailOTPConfirm(BaseModel):
    code: str
    purpose: str  # "enable" or "disable"


@router.post("/setup")
def setup_otp(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    secret = pyotp.random_base32()
    user.totp_secret = secret
    db.commit()
    totp = pyotp.TOTP(secret)
    uri = totp.provisioning_uri(name=user.email, issuer_name="PKMS")

    img = qrcode.make(uri)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    qr_b64 = base64.b64encode(buf.getvalue()).decode()

    return {"secret": secret, "qr_code": f"data:image/png;base64,{qr_b64}", "provisioning_uri": uri}


@router.post("/verify")
def verify_otp(body: OTPVerify, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if not user.totp_secret:
        raise HTTPException(status_code=400, detail="OTP not set up")
    totp = pyotp.TOTP(user.totp_secret)
    if not totp.verify(body.code):
        raise HTTPException(status_code=400, detail="Invalid OTP code")
    user.totp_enabled = True
    db.commit()
    return {"enabled": True}


@router.post("/disable")
def disable_otp(body: OTPVerify, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if not user.totp_secret or not user.totp_enabled:
        raise HTTPException(status_code=400, detail="OTP not enabled")
    if not user.email_otp_enabled:
        raise HTTPException(status_code=400, detail="Cannot disable your only two-factor method. Set up another method first.")
    totp = pyotp.TOTP(user.totp_secret)
    if not totp.verify(body.code):
        raise HTTPException(status_code=400, detail="Invalid OTP code")
    user.totp_enabled = False
    user.totp_secret = None
    db.commit()
    return {"enabled": False}


@router.get("/status", response_model=OTPStatus)
def otp_status(user: User = Depends(get_current_user)):
    return {"enabled": user.totp_enabled, "email_enabled": user.email_otp_enabled}


@router.post("/email/request")
def request_email_otp(
    purpose: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if purpose not in ("enable", "disable"):
        raise HTTPException(status_code=400, detail="Invalid purpose")
    if purpose == "disable" and not user.email_otp_enabled:
        raise HTTPException(status_code=400, detail="Email OTP not enabled")
    if purpose == "disable" and not user.totp_enabled:
        raise HTTPException(status_code=400, detail="Cannot disable your only two-factor method. Set up another method first.")
    create_and_send_code(db, user, purpose)
    return {"sent": True}


@router.post("/email/confirm")
def confirm_email_otp(
    body: EmailOTPConfirm,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if body.purpose not in ("enable", "disable"):
        raise HTTPException(status_code=400, detail="Invalid purpose")
    if body.purpose == "disable" and not user.totp_enabled:
        raise HTTPException(status_code=400, detail="Cannot disable your only two-factor method. Set up another method first.")
    if not verify_code(db, user, body.purpose, body.code):
        raise HTTPException(status_code=400, detail="Invalid or expired code")
    user.email_otp_enabled = body.purpose == "enable"
    db.commit()
    return {"enabled": user.email_otp_enabled}
