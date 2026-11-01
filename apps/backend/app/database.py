from uuid import uuid4

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool

from app.config import settings

if settings.SERVERLESS:
    # Supabase's transaction pooler (Supavisor) doesn't support prepared statements across
    # transactions, and serverless instances shouldn't hold their own connection pool.
    engine = create_async_engine(
        settings.DATABASE_URL,
        poolclass=NullPool,
        connect_args={
            "statement_cache_size": 0,
            "prepared_statement_name_func": lambda: f"__asyncpg_{uuid4()}__",
        },
    )
else:
    engine = create_async_engine(
        settings.DATABASE_URL,
        echo=settings.ENVIRONMENT == "development",
        pool_size=10,
        max_overflow=20,
    )

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
