from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import ai, auth, budgets, goals, net_worth, plaid, transactions

app = FastAPI(
    title="FinGuard AI",
    version="2.0.0",
    description="Personal Finance Dashboard — Plaid-powered spending, budgets, goals & net worth",
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
app.include_router(plaid.router, prefix="/plaid", tags=["plaid"])
app.include_router(transactions.router, prefix="/transactions", tags=["transactions"])
app.include_router(budgets.router, prefix="/budgets", tags=["budgets"])
app.include_router(goals.router, prefix="/goals", tags=["goals"])
app.include_router(net_worth.router, prefix="/net-worth", tags=["net-worth"])
app.include_router(ai.router, prefix="/ai", tags=["ai"])


@app.get("/health", tags=["system"])
async def health_check():
    return {"status": "ok", "version": "2.0.0", "environment": settings.ENVIRONMENT}
