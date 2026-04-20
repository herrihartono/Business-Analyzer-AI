"""
Redis caching layer for SmartBiz Analyzer.

Provides async caching for:
- Analysis results (keyed by upload_id)
- Chat responses  (keyed by analysis_id + question hash)
- Gemini responses (keyed by prompt hash)
"""

from __future__ import annotations

import hashlib
import json
import logging
from typing import Any

import redis.asyncio as aioredis

from app.config import get_settings

logger = logging.getLogger(__name__)

_pool: aioredis.Redis | None = None

TTL_ANALYSIS = 60 * 60 * 24      # 24 hours
TTL_CHAT     = 60 * 60 * 4       # 4 hours
TTL_GEMINI   = 60 * 60 * 12      # 12 hours
TTL_DASHBOARD = 60 * 5           # 5 minutes


def _redis_enabled() -> bool:
    url = get_settings().redis_url
    return bool(url and url.strip())


async def init_redis() -> None:
    """Create the global async Redis connection pool."""
    global _pool
    if not _redis_enabled():
        logger.info("Redis URL not set — caching disabled")
        return
    try:
        _pool = aioredis.from_url(
            get_settings().redis_url,
            decode_responses=True,
            socket_connect_timeout=5,
        )
        await _pool.ping()
        logger.info("Redis connected: %s", get_settings().redis_url)
    except Exception as e:
        logger.warning("Redis connection failed (%s) — caching disabled", e)
        _pool = None


async def close_redis() -> None:
    global _pool
    if _pool:
        await _pool.aclose()
        _pool = None


def _hash_key(*parts: str) -> str:
    raw = "|".join(parts)
    return hashlib.sha256(raw.encode()).hexdigest()[:16]


async def _get(key: str) -> Any | None:
    if not _pool:
        return None
    try:
        data = await _pool.get(key)
        if data:
            return json.loads(data)
    except Exception as e:
        logger.debug("Redis GET error for %s: %s", key, e)
    return None


async def _set(key: str, value: Any, ttl: int) -> None:
    if not _pool:
        return
    try:
        await _pool.set(key, json.dumps(value, default=str, ensure_ascii=False), ex=ttl)
    except Exception as e:
        logger.debug("Redis SET error for %s: %s", key, e)


async def _delete_pattern(pattern: str) -> int:
    """Delete all keys matching a glob pattern."""
    if not _pool:
        return 0
    count = 0
    try:
        async for key in _pool.scan_iter(match=pattern, count=100):
            await _pool.delete(key)
            count += 1
    except Exception as e:
        logger.debug("Redis DELETE pattern error: %s", e)
    return count


# ── Analysis cache ───────────────────────────────────────────────

async def get_cached_analysis(upload_id: str) -> dict | None:
    key = f"analysis:{upload_id}"
    return await _get(key)


async def set_cached_analysis(upload_id: str, data: dict) -> None:
    key = f"analysis:{upload_id}"
    await _set(key, data, TTL_ANALYSIS)


async def invalidate_analysis(upload_id: str) -> None:
    if _pool:
        try:
            await _pool.delete(f"analysis:{upload_id}")
        except Exception:
            pass


# ── Chat cache ───────────────────────────────────────────────────

async def get_cached_chat(analysis_id: str, question: str) -> str | None:
    key = f"chat:{analysis_id}:{_hash_key(question.strip().lower())}"
    result = await _get(key)
    return result.get("answer") if result else None


async def set_cached_chat(analysis_id: str, question: str, answer: str) -> None:
    key = f"chat:{analysis_id}:{_hash_key(question.strip().lower())}"
    await _set(key, {"answer": answer}, TTL_CHAT)


# ── Gemini response cache (deduplication of identical prompts) ───

async def get_cached_gemini(system_prompt: str, user_prompt: str) -> str | None:
    key = f"gemini:{_hash_key(system_prompt, user_prompt)}"
    result = await _get(key)
    return result.get("response") if result else None


async def set_cached_gemini(system_prompt: str, user_prompt: str, response: str) -> None:
    key = f"gemini:{_hash_key(system_prompt, user_prompt)}"
    await _set(key, {"response": response}, TTL_GEMINI)


# ── Dashboard / stats cache ─────────────────────────────────────

async def get_cached_dashboard() -> dict | None:
    return await _get("dashboard:stats")


async def set_cached_dashboard(data: dict) -> None:
    await _set("dashboard:stats", data, TTL_DASHBOARD)


async def invalidate_dashboard() -> None:
    if _pool:
        try:
            await _pool.delete("dashboard:stats")
        except Exception:
            pass


# ── Health check ─────────────────────────────────────────────────

async def redis_health() -> dict:
    if not _redis_enabled():
        return {"status": "disabled", "message": "REDIS_URL not configured"}
    if not _pool:
        return {"status": "disconnected", "message": "Connection pool not initialised"}
    try:
        await _pool.ping()
        info = await _pool.info("memory")
        keys_count = await _pool.dbsize()
        return {
            "status": "connected",
            "keys": keys_count,
            "used_memory": info.get("used_memory_human", "?"),
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}
