from fastapi import APIRouter

from app.services.redis_cache import (
    redis_health,
    _pool,
    _delete_pattern,
    invalidate_dashboard,
)

router = APIRouter(tags=["cache"])


@router.get("/cache/status")
async def cache_status():
    """Get Redis cache health and statistics."""
    return await redis_health()


@router.post("/cache/flush")
async def flush_cache():
    """Flush all SmartBiz cache entries (analysis, chat, openai, dashboard)."""
    if not _pool:
        return {"flushed": 0, "message": "Redis not connected"}

    total = 0
    for prefix in ("analysis:*", "chat:*", "openai:*", "dashboard:*"):
        total += await _delete_pattern(prefix)

    return {"flushed": total, "message": f"Cleared {total} cached entries"}


@router.post("/cache/flush/{prefix}")
async def flush_cache_by_prefix(prefix: str):
    """Flush cache entries by prefix: analysis, chat, openai, or dashboard."""
    allowed = {"analysis", "chat", "openai", "dashboard"}
    if prefix not in allowed:
        return {"error": f"Unknown prefix. Allowed: {', '.join(sorted(allowed))}"}

    if not _pool:
        return {"flushed": 0, "message": "Redis not connected"}

    count = await _delete_pattern(f"{prefix}:*")
    return {"flushed": count, "prefix": prefix}
