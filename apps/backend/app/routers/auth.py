from fastapi import APIRouter

from app.dependencies import CurrentUser, DBSession
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UserResponse
from app.services import auth_service

router = APIRouter()


@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(req: RegisterRequest, db: DBSession) -> TokenResponse:
    tenant, user = await auth_service.register_user(db, req)
    token = auth_service.create_access_token(user.id, tenant.id, user.role)
    return TokenResponse(
        access_token=token,
        expires_in=60 * 60,
    )


@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest, db: DBSession) -> TokenResponse:
    user = await auth_service.authenticate_user(db, req.email, req.password)
    token = auth_service.create_access_token(user.id, user.tenant_id, user.role)
    return TokenResponse(
        access_token=token,
        expires_in=60 * 60,
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: CurrentUser) -> UserResponse:
    return current_user
