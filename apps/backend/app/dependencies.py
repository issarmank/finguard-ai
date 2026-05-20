from typing import Annotated
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db

bearer_scheme = HTTPBearer()


async def get_current_tenant_id(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(bearer_scheme)],
) -> UUID:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
        )
        tenant_id: str | None = payload.get("tenant_id")
        if tenant_id is None:
            raise credentials_exception
        return UUID(tenant_id)
    except (JWTError, ValueError):
        raise credentials_exception


# Convenience type aliases for router injection
DBSession = Annotated[AsyncSession, Depends(get_db)]
CurrentTenantId = Annotated[UUID, Depends(get_current_tenant_id)]
