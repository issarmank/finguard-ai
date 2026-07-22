from pydantic_settings import BaseSettings, SettingsConfigDict

_INSECURE_JWT_SECRET = "change-me-in-production"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str = "postgresql+asyncpg://postgres:dev_password@localhost:5432/finguard_dev"
    JWT_SECRET: str = _INSECURE_JWT_SECRET
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60
    OPENROUTER_API_KEY: str = ""
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "https://finguard-tracker-ai.vercel.app"]
    ENVIRONMENT: str = "development"
    PLAID_CLIENT_ID: str = ""
    PLAID_SECRET: str = ""
    PLAID_ENV: str = "sandbox"
    PLAID_ENCRYPTION_KEY: str = ""

    def model_post_init(self, __context: object) -> None:
        if self.ENVIRONMENT == "production":
            if not self.JWT_SECRET or self.JWT_SECRET == _INSECURE_JWT_SECRET or len(self.JWT_SECRET) < 32:
                raise RuntimeError(
                    "JWT_SECRET must be set to a strong, unique value in production "
                    "(>= 32 chars, not the default). Generate one with `openssl rand -hex 32`."
                )
            if not self.PLAID_ENCRYPTION_KEY:
                raise RuntimeError(
                    "PLAID_ENCRYPTION_KEY must be set in production. "
                    "Generate one with: python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
                )


settings = Settings()
