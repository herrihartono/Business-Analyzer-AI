import sys
import os
from pathlib import Path
from functools import lru_cache

from dotenv import load_dotenv
from pydantic_settings import BaseSettings

env_path = Path(__file__).resolve().parent.parent / ".env"
if env_path.exists():
    load_dotenv(env_path)

REQUIRED_ENV_VARS = {
    "GEMINI_API_KEY": "Google AI Studio API key (https://aistudio.google.com/apikey)",
}

OPTIONAL_ENV_VARS = {
    "DATABASE_URL": "Database connection string (default: SQLite)",
    "REDIS_URL": "Redis connection string (leave empty to disable caching)",
    "SECRET_KEY": "Secret key for signing tokens",
    "ALLOWED_ORIGINS": "Comma-separated allowed CORS origins",
    "GEMINI_MODEL": "Gemini model name (default: gemini-2.0-flash)",
}


class Settings(BaseSettings):
    database_url: str = "sqlite+aiosqlite:///./smartbiz.db"
    redis_url: str = ""
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.0-flash"
    secret_key: str = "change-me"
    upload_dir: str = "uploads"
    allowed_origins: str = "http://localhost:3000"

    model_config = {"env_file": ".env", "extra": "ignore"}


def _validate_env() -> None:
    """Check that all required env vars are present and print clear errors."""
    missing: list[str] = []
    for var, description in REQUIRED_ENV_VARS.items():
        if not os.getenv(var):
            missing.append(f"  - {var}: {description}")

    if missing:
        msg = (
            "\n"
            "=" * 60 + "\n"
            "  MISSING REQUIRED ENVIRONMENT VARIABLES\n"
            "=" * 60 + "\n"
            "\n"
            "The following variables must be set in backend/.env\n"
            "or as environment variables on your hosting platform:\n"
            "\n"
            + "\n".join(missing) + "\n"
            "\n"
            "See backend/.env.example for reference.\n"
            "=" * 60 + "\n"
        )
        print(msg, file=sys.stderr)
        raise SystemExit(1)


_validate_env()


@lru_cache
def get_settings() -> Settings:
    return Settings()
