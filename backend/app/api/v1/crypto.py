import base64

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.v1.deps import get_current_user
from app.core.crypto import derive_master_key
from app.database import get_db
from app.models import User

router = APIRouter(prefix="/crypto", tags=["crypto"])


class MasterKeyRequest(BaseModel):
    passphrase: str


class MasterKeyResponse(BaseModel):
    valid: bool


@router.post("/verify-passphrase", response_model=MasterKeyResponse)
def verify_passphrase(body: MasterKeyRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Verify that a passphrase can derive a key (always returns valid=True if user is authenticated)."""
    salt = base64.b64decode(user.salt)
    derive_master_key(body.passphrase, salt)
    return {"valid": True}


@router.get("/salt")
def get_salt(user: User = Depends(get_current_user)):
    return {"salt": user.salt}
