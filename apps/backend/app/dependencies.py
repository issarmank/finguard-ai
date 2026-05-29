import uuid
from typing import Annotated, TypeAlias

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db

bearer_scheme = HTTPBearer()


async def get_current_user_id(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(bearer_scheme)],
) -> uuid.UUID:
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
        )
        user_id: str | None = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        return uuid.UUID(user_id)
    except (JWTError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


async def get_current_user(
    db: Annotated[AsyncSession, Depends(get_db)],
    user_id: Annotated[uuid.UUID, Depends(get_current_user_id)],
):
    from app.models.user import User

    user = await db.scalar(select(User).where(User.id == user_id))
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


# Type aliases for clean router injection
DBSession: TypeAlias = Annotated[AsyncSession, Depends(get_db)]
CurrentUserId: TypeAlias = Annotated[uuid.UUID, Depends(get_current_user_id)]
CurrentUser: TypeAlias = Annotated[object, Depends(get_current_user)]
