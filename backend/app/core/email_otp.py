import secrets
from datetime import datetime, timedelta

import httpx
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.email import send_email
from app.core.security import hash_password, verify_password
from app.models import EmailOTP, User

CODE_VALID_MINUTES = 10
RETENTION_HOURS = 24


def generate_code() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def purge_expired(db: Session) -> None:
    cutoff = datetime.utcnow() - timedelta(hours=RETENTION_HOURS)
    db.query(EmailOTP).filter(EmailOTP.created_at < cutoff).delete()
    db.commit()


def create_and_send_code(db: Session, user: User, purpose: str) -> None:
    purge_expired(db)
    code = generate_code()
    otp = EmailOTP(
        user_id=user.id,
        code_hash=hash_password(code),
        purpose=purpose,
        expires_at=datetime.utcnow() + timedelta(minutes=CODE_VALID_MINUTES),
    )
    db.add(otp)
    db.commit()

    subject = {
        "enable": "Your PKMS verification code",
        "disable": "Your PKMS verification code",
        "login": "Your PKMS login code",
    }.get(purpose, "Your PKMS verification code")

    try:
        send_email(
            user.email,
            subject,
            f"<p>Your PKMS code is <b>{code}</b>. It expires in {CODE_VALID_MINUTES} minutes.</p>",
        )
    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=502,
            detail=f"Could not send email (provider returned {e.response.status_code}). Check RESEND_API_KEY and EMAIL_FROM.",
        )


def verify_code(db: Session, user: User, purpose: str, code: str) -> bool:
    purge_expired(db)
    otp = (
        db.query(EmailOTP)
        .filter(EmailOTP.user_id == user.id, EmailOTP.purpose == purpose, EmailOTP.consumed == False)  # noqa: E712
        .order_by(EmailOTP.created_at.desc())
        .first()
    )
    if not otp or otp.expires_at < datetime.utcnow():
        return False
    if not verify_password(code, otp.code_hash):
        return False
    otp.consumed = True
    db.commit()
    return True
