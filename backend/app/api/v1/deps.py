from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.orm import Session

from app.core.security import decode_token
from app.database import get_db
from app.models import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token")


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    creds_exc = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    try:
        payload = decode_token(token)
        if payload.get("typ") == "preauth":
            raise creds_exc
        user_id_str: str = payload.get("sub")
        if user_id_str is None:
            raise creds_exc
        user_id = int(user_id_str)
        if user_id is None:
            raise creds_exc
    except JWTError:
        raise creds_exc
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise creds_exc
    return user
