import base64
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.v1.deps import get_current_user
from app.core.crypto import derive_master_key, encrypt_secret, decrypt_secret, generate_data_key, wrap_data_key, unwrap_data_key
from app.database import get_db
from app.models import HostingAccount, User

router = APIRouter(prefix="/hosting", tags=["hosting"])


class HostingCreate(BaseModel):
    name: str
    provider: str
    token: Optional[str] = None
    passphrase: Optional[str] = None


class HostingReveal(BaseModel):
    passphrase: str


class HostingResponse(BaseModel):
    id: int
    name: str
    provider: str
    has_token: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class HostingWithToken(HostingResponse):
    token: str


def _own(account_id: int, user: User, db: Session) -> HostingAccount:
    a = db.query(HostingAccount).filter(HostingAccount.id == account_id, HostingAccount.user_id == user.id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Hosting account not found")
    return a


@router.get("", response_model=list[HostingResponse])
def list_hosting(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return db.query(HostingAccount).filter(HostingAccount.user_id == user.id).all()


@router.post("", response_model=HostingResponse, status_code=201)
def create_hosting(body: HostingCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    account = HostingAccount(user_id=user.id, name=body.name, provider=body.provider)
    if body.token and body.passphrase:
        salt = base64.b64decode(user.salt)
        master_key = derive_master_key(body.passphrase, salt)
        data_key = generate_data_key()
        account.wrapped_data_key = wrap_data_key(data_key, master_key)
        enc = encrypt_secret(body.token, data_key)
        account.token_enc = enc["value_enc"]
        account.token_iv = enc["iv"]
        account.token_tag = enc["tag"]
    db.add(account)
    db.commit()
    db.refresh(account)
    return account


@router.post("/{account_id}/reveal", response_model=HostingWithToken)
def reveal_hosting_token(account_id: int, body: HostingReveal, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    account = _own(account_id, user, db)
    if not account.token_enc or not account.wrapped_data_key:
        raise HTTPException(status_code=400, detail="No token stored for this account")
    try:
        salt = base64.b64decode(user.salt)
        master_key = derive_master_key(body.passphrase, salt)
        data_key = unwrap_data_key(account.wrapped_data_key, master_key)
        token = decrypt_secret(account.token_enc, account.token_iv, account.token_tag, data_key)
    except Exception:
        raise HTTPException(status_code=400, detail="Wrong passphrase or corrupted data")
    return {**HostingResponse.model_validate(account).model_dump(), "token": token}


@router.delete("/{account_id}", status_code=204)
def delete_hosting(account_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    a = _own(account_id, user, db)
    db.delete(a)
    db.commit()
