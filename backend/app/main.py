from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.api.routes import upload, analysis, dashboard, chat


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


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
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router, prefix="/api")
app.include_router(analysis.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(chat.router, prefix="/api")


@app.get("/api/health")
async def health():
    return {"status": "ok"}
