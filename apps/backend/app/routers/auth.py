from fastapi import APIRouter, Response

from app.config import settings
from app.dependencies import CurrentUser, DBSession
from app.schemas.auth import LoginRequest, RegisterRequest, UserResponse
from app.services import auth_service

router = APIRouter()


def _set_auth_cookie(response: Response, token: str) -> None:
    is_prod = settings.ENVIRONMENT == "production"
    response.set_cookie(
        key="fg_token",
        value=token,
        httponly=True,
        secure=is_prod,
        samesite="none" if is_prod else "lax",
        max_age=settings.JWT_EXPIRE_MINUTES * 60,
        path="/",
    )


@router.post("/register", response_model=UserResponse, status_code=201)
async def register(req: RegisterRequest, db: DBSession, response: Response) -> UserResponse:
    user = await auth_service.register_user(db, req)
    token = auth_service.create_access_token(user.id)
    _set_auth_cookie(response, token)
    return user


@router.post("/login", response_model=UserResponse)
async def login(req: LoginRequest, db: DBSession, response: Response) -> UserResponse:
    user = await auth_service.authenticate_user(db, req.email, req.password)
    token = auth_service.create_access_token(user.id)
    _set_auth_cookie(response, token)
    return user


@router.post("/logout", status_code=204)
async def logout(response: Response) -> None:
    is_prod = settings.ENVIRONMENT == "production"
    response.delete_cookie(key="fg_token", path="/", samesite="none" if is_prod else "lax")


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: CurrentUser) -> UserResponse:
    return current_user
