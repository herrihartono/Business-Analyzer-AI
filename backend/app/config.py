from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://smartbiz:smartbiz_secret@localhost:5432/smartbiz"
    database_url_sync: str = "postgresql://smartbiz:smartbiz_secret@localhost:5432/smartbiz"
    redis_url: str = "redis://localhost:6379/0"
    openai_api_key: str = ""
    secret_key: str = "change-me"
    upload_dir: str = "uploads"
    allowed_origins: str = "http://localhost:3000"

    model_config = {"env_file": ".env", "extra": "ignore"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
