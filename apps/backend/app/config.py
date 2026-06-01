from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str = "postgresql+asyncpg://postgres:dev_password@localhost:5432/finguard_dev"
    JWT_SECRET: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60
    OPENROUTER_API_KEY: str = ""
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "https://finguard-tracker-ai.vercel.app"]
    ENVIRONMENT: str = "development"
    PLAID_CLIENT_ID: str = ""
    PLAID_SECRET: str = ""
    PLAID_ENV: str = "sandbox"


settings = Settings()
