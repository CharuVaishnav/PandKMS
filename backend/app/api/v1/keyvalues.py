from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.v1.deps import get_current_user
from app.database import get_db
from app.models import KeyValue, Project, User

router = APIRouter(prefix="/projects/{project_id}/keyvalues", tags=["keyvalues"])


class KVCreate(BaseModel):
    key: str
    value: Optional[str] = None


class KVUpdate(BaseModel):
    key: Optional[str] = None
    value: Optional[str] = None


class KVResponse(BaseModel):
    id: int
    key: str
    value: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


def _get_project(project_id: int, user: User, db: Session) -> Project:
    p = db.query(Project).filter(Project.id == project_id, Project.user_id == user.id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    return p


@router.get("", response_model=list[KVResponse])
def list_kvs(project_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _get_project(project_id, user, db)
    return db.query(KeyValue).filter(KeyValue.project_id == project_id).all()


@router.post("", response_model=KVResponse, status_code=201)
def create_kv(project_id: int, body: KVCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _get_project(project_id, user, db)
    kv = KeyValue(project_id=project_id, key=body.key, value=body.value)
    db.add(kv)
    db.commit()
    db.refresh(kv)
    return kv


@router.patch("/{kv_id}", response_model=KVResponse)
def update_kv(project_id: int, kv_id: int, body: KVUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _get_project(project_id, user, db)
    kv = db.query(KeyValue).filter(KeyValue.id == kv_id, KeyValue.project_id == project_id).first()
    if not kv:
        raise HTTPException(status_code=404, detail="Key not found")
    if body.key is not None:
        kv.key = body.key
    if body.value is not None:
        kv.value = body.value
    kv.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(kv)
    return kv


@router.delete("/{kv_id}", status_code=204)
def delete_kv(project_id: int, kv_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _get_project(project_id, user, db)
    kv = db.query(KeyValue).filter(KeyValue.id == kv_id, KeyValue.project_id == project_id).first()
    if not kv:
        raise HTTPException(status_code=404, detail="Key not found")
    db.delete(kv)
    db.commit()
