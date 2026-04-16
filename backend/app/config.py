import sys
from pathlib import Path
from functools import lru_cache

from dotenv import load_dotenv
from pydantic_settings import BaseSettings

env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(env_path)

REQUIRED_ENV_VARS = {
    "DATABASE_URL": "Database connection string (e.g. sqlite+aiosqlite:///./smartbiz.db)",
    "OPENAI_API_KEY": "OpenAI API key for AI-powered analysis (https://platform.openai.com/api-keys)",
    "REDIS_URL": "Redis connection string (leave empty to disable caching)",
}


class Settings(BaseSettings):
    database_url: str
    redis_url: str
    openai_api_key: str
    secret_key: str = "change-me"
    upload_dir: str = "uploads"
    allowed_origins: str = "http://localhost:3000"

    model_config = {"env_file": ".env", "extra": "ignore"}


def _validate_env() -> None:
    """Check that all required env vars are present and print clear errors."""
    import os

    missing: list[str] = []
    for var, description in REQUIRED_ENV_VARS.items():
        if os.getenv(var) is None:
            missing.append(f"  - {var}: {description}")

    if missing:
        msg = (
            "\n"
            "=" * 60 + "\n"
            "  MISSING REQUIRED ENVIRONMENT VARIABLES\n"
            "=" * 60 + "\n"
            "\n"
            "The following variables must be set in backend/.env:\n"
            "\n"
            + "\n".join(missing) + "\n"
            "\n"
            "Create or update backend/.env with these values.\n"
            "See backend/.env.example for reference.\n"
            "=" * 60 + "\n"
        )
        print(msg, file=sys.stderr)
        raise SystemExit(1)


_validate_env()


@lru_cache
def get_settings() -> Settings:
    return Settings()
