import base64
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.v1.deps import get_current_user
from app.core.crypto import (
    decrypt_secret,
    derive_master_key,
    encrypt_secret,
    generate_data_key,
    unwrap_data_key,
    wrap_data_key,
)
from app.database import get_db
from app.models import Project, Secret, User

router = APIRouter(prefix="/projects/{project_id}/secrets", tags=["secrets"])


class SecretCreate(BaseModel):
    name: str
    value: str
    passphrase: str


class SecretReveal(BaseModel):
    passphrase: str


class SecretUpdate(BaseModel):
    name: Optional[str] = None
    value: Optional[str] = None
    passphrase: str


class SecretResponse(BaseModel):
    id: int
    name: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SecretWithValue(SecretResponse):
    value: str


def _get_project(project_id: int, user: User, db: Session) -> Project:
    p = db.query(Project).filter(Project.id == project_id, Project.user_id == user.id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    return p


def _get_data_key(project: Project, passphrase: str, user: User) -> bytes:
    salt = base64.b64decode(user.salt)
    master_key = derive_master_key(passphrase, salt)
    if project.wrapped_data_key is None:
        raise HTTPException(status_code=400, detail="Project has no data key")
    return unwrap_data_key(project.wrapped_data_key, master_key)


def _ensure_data_key(project: Project, passphrase: str, user: User, db: Session) -> bytes:
    salt = base64.b64decode(user.salt)
    master_key = derive_master_key(passphrase, salt)
    if project.wrapped_data_key is None:
        data_key = generate_data_key()
        project.wrapped_data_key = wrap_data_key(data_key, master_key)
        db.commit()
        return data_key
    return unwrap_data_key(project.wrapped_data_key, master_key)


@router.get("", response_model=list[SecretResponse])
def list_secrets(project_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _get_project(project_id, user, db)
    return db.query(Secret).filter(Secret.project_id == project_id).all()


@router.post("", response_model=SecretResponse, status_code=201)
def create_secret(project_id: int, body: SecretCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    project = _get_project(project_id, user, db)
    data_key = _ensure_data_key(project, body.passphrase, user, db)
    enc = encrypt_secret(body.value, data_key)
    secret = Secret(
        project_id=project_id,
        name=body.name,
        value_enc=enc["value_enc"],
        iv=enc["iv"],
        tag=enc["tag"],
    )
    db.add(secret)
    db.commit()
    db.refresh(secret)
    return secret


@router.post("/{secret_id}/reveal", response_model=SecretWithValue)
def reveal_secret(project_id: int, secret_id: int, body: SecretReveal, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    project = _get_project(project_id, user, db)
    secret = db.query(Secret).filter(Secret.id == secret_id, Secret.project_id == project_id).first()
    if not secret:
        raise HTTPException(status_code=404, detail="Secret not found")
    try:
        data_key = _get_data_key(project, body.passphrase, user)
        value = decrypt_secret(secret.value_enc, secret.iv, secret.tag, data_key)
    except Exception:
        raise HTTPException(status_code=400, detail="Wrong passphrase or corrupted data")
    return {**SecretResponse.model_validate(secret).model_dump(), "value": value}


@router.patch("/{secret_id}", response_model=SecretResponse)
def update_secret(project_id: int, secret_id: int, body: SecretUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    project = _get_project(project_id, user, db)
    secret = db.query(Secret).filter(Secret.id == secret_id, Secret.project_id == project_id).first()
    if not secret:
        raise HTTPException(status_code=404, detail="Secret not found")
    if body.name is not None:
        secret.name = body.name
    if body.value is not None:
        data_key = _get_data_key(project, body.passphrase, user)
        enc = encrypt_secret(body.value, data_key)
        secret.value_enc = enc["value_enc"]
        secret.iv = enc["iv"]
        secret.tag = enc["tag"]
    secret.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(secret)
    return secret


@router.delete("/{secret_id}", status_code=204)
def delete_secret(project_id: int, secret_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _get_project(project_id, user, db)
    secret = db.query(Secret).filter(Secret.id == secret_id, Secret.project_id == project_id).first()
    if not secret:
        raise HTTPException(status_code=404, detail="Secret not found")
    db.delete(secret)
    db.commit()
