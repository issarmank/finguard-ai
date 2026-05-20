from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import ai, auth, accounts, ledger, tenants

app = FastAPI(
    title="FinGuard AI",
    version="0.1.0",
    description="Multi-Tenant Financial Ledger & AI-Driven Compliance/Audit Engine",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(tenants.router, prefix="/tenants", tags=["tenants"])
app.include_router(accounts.router, prefix="/accounts", tags=["accounts"])
app.include_router(ledger.router, prefix="/ledger", tags=["ledger"])
app.include_router(ai.router, prefix="/ai", tags=["ai"])


@app.get("/health", tags=["system"])
async def health_check():
    return {"status": "ok", "version": "0.1.0", "environment": settings.ENVIRONMENT}
