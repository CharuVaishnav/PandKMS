import base64
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.v1.deps import get_current_user
from app.core.crypto import derive_master_key, encrypt_secret, decrypt_secret, generate_data_key, wrap_data_key, unwrap_data_key
from app.database import get_db
from app.models import GitRepo, User

router = APIRouter(prefix="/repos", tags=["repos"])


class RepoCreate(BaseModel):
    name: str
    url: Optional[str] = None
    provider: str = "github"
    token: Optional[str] = None
    passphrase: Optional[str] = None


class RepoReveal(BaseModel):
    passphrase: str


class RepoResponse(BaseModel):
    id: int
    name: str
    url: Optional[str]
    provider: str
    has_token: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class RepoWithToken(RepoResponse):
    token: str


def _own(repo_id: int, user: User, db: Session) -> GitRepo:
    r = db.query(GitRepo).filter(GitRepo.id == repo_id, GitRepo.user_id == user.id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Repo not found")
    return r


@router.get("", response_model=list[RepoResponse])
def list_repos(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return db.query(GitRepo).filter(GitRepo.user_id == user.id).all()


@router.post("", response_model=RepoResponse, status_code=201)
def create_repo(body: RepoCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    repo = GitRepo(user_id=user.id, name=body.name, url=body.url, provider=body.provider)
    if body.token and body.passphrase:
        salt = base64.b64decode(user.salt)
        master_key = derive_master_key(body.passphrase, salt)
        data_key = generate_data_key()
        repo.wrapped_data_key = wrap_data_key(data_key, master_key)
        enc = encrypt_secret(body.token, data_key)
        repo.token_enc = enc["value_enc"]
        repo.token_iv = enc["iv"]
        repo.token_tag = enc["tag"]
    db.add(repo)
    db.commit()
    db.refresh(repo)
    return repo


@router.post("/{repo_id}/reveal", response_model=RepoWithToken)
def reveal_repo_token(repo_id: int, body: RepoReveal, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    repo = _own(repo_id, user, db)
    if not repo.token_enc or not repo.wrapped_data_key:
        raise HTTPException(status_code=400, detail="No token stored for this repo")
    try:
        salt = base64.b64decode(user.salt)
        master_key = derive_master_key(body.passphrase, salt)
        data_key = unwrap_data_key(repo.wrapped_data_key, master_key)
        token = decrypt_secret(repo.token_enc, repo.token_iv, repo.token_tag, data_key)
    except Exception:
        raise HTTPException(status_code=400, detail="Wrong passphrase or corrupted data")
    return {**RepoResponse.model_validate(repo).model_dump(), "token": token}


@router.delete("/{repo_id}", status_code=204)
def delete_repo(repo_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    r = _own(repo_id, user, db)
    db.delete(r)
    db.commit()
