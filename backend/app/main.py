import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import init_db

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    try:
        from app.services.redis_cache import init_redis, close_redis
        await init_redis()
    except Exception as e:
        logger.warning("Redis init skipped: %s", e)
    yield
    try:
        from app.services.redis_cache import close_redis
        await close_redis()
    except Exception:
        pass


app = FastAPI(
    title="SmartBiz Analyzer API",
    description="AI-powered business analysis platform",
    version="1.0.0",
    lifespan=lifespan,
)

settings = get_settings()
origins = [o.strip() for o in settings.allowed_origins.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.api.routes import upload, analysis, dashboard, chat, cache

app.include_router(upload.router, prefix="/api")
app.include_router(analysis.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(cache.router, prefix="/api")


@app.get("/")
async def root():
    return {"status": "ok"}


@app.get("/api/health")
async def health():
    try:
        from app.services.redis_cache import redis_health
        redis_info = await redis_health()
    except Exception:
        redis_info = {"status": "unavailable"}
    return {"status": "ok", "redis": redis_info}
