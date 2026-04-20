from __future__ import annotations

import hashlib
import json
import logging
from typing import Any

import google.generativeai as genai
import polars as pl
import redis as sync_redis

from app.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

_sync_pool: sync_redis.Redis | None = None
_GEMINI_CACHE_TTL = 60 * 60 * 12  # 12 hours
_gemini_configured = False


def _ensure_gemini() -> None:
    global _gemini_configured
    if not _gemini_configured and settings.gemini_api_key:
        genai.configure(api_key=settings.gemini_api_key)
        _gemini_configured = True


def _get_sync_redis() -> sync_redis.Redis | None:
    """Lazy-init a synchronous Redis client for use inside sync functions."""
    global _sync_pool
    if _sync_pool is not None:
        return _sync_pool
    url = settings.redis_url
    if not url or not url.strip():
        return None
    try:
        _sync_pool = sync_redis.from_url(url, decode_responses=True, socket_connect_timeout=2)
        _sync_pool.ping()
        return _sync_pool
    except Exception as e:
        logger.debug("Sync Redis unavailable: %s", e)
        _sync_pool = None
        return None


def _cache_key(system_prompt: str, user_prompt: str) -> str:
    raw = f"{system_prompt}|{user_prompt}"
    return f"gemini:{hashlib.sha256(raw.encode()).hexdigest()[:16]}"


def _has_gemini() -> bool:
    return bool(settings.gemini_api_key and settings.gemini_api_key.strip())


def _call_gemini(system_prompt: str, user_prompt: str, temperature: float = 0.3) -> str | None:
    """Call Google Gemini API with Redis caching."""
    if not _has_gemini():
        return None

    r = _get_sync_redis()
    if r:
        key = _cache_key(system_prompt, user_prompt)
        try:
            cached = r.get(key)
            if cached:
                logger.info("Redis cache HIT for Gemini call (%s)", key)
                return cached
        except Exception:
            pass

    try:
        _ensure_gemini()
        model = genai.GenerativeModel(
            model_name=settings.gemini_model,
            system_instruction=system_prompt,
            generation_config=genai.GenerationConfig(temperature=temperature),
        )
        response = model.generate_content(user_prompt)
        result = response.text

        if r and result:
            try:
                r.set(_cache_key(system_prompt, user_prompt), result, ex=_GEMINI_CACHE_TTL)
            except Exception:
                pass

        return result
    except Exception as e:
        logger.warning("Gemini call failed: %s", e)
        return None


def _parse_json_response(text: str | None) -> Any:
    """Safely parse a JSON response from the LLM."""
    if not text:
        return None
    try:
        cleaned = text.strip()
        if cleaned.startswith("```"):
            lines = cleaned.split("\n")
            lines = [l for l in lines if not l.strip().startswith("```")]
            cleaned = "\n".join(lines)
        return json.loads(cleaned)
    except json.JSONDecodeError:
        return None


def _build_full_document_context(df: pl.DataFrame) -> str:
    """Build a rich text representation of ALL the data for the LLM to read."""
    lines = []
    lines.append(f"DATASET: {len(df)} rows, {len(df.columns)} columns")
    lines.append(f"COLUMNS: {', '.join(df.columns)}")
    lines.append("")

    for col in df.columns:
        dtype = str(df[col].dtype)
        null_count = df[col].null_count()
        unique = df[col].n_unique()
        info = f"  {col} (type={dtype}, nulls={null_count}, unique={unique})"

        if df[col].dtype in (pl.Float64, pl.Float32, pl.Int64, pl.Int32):
            s = df[col].drop_nulls()
            if len(s) > 0:
                info += f" min={s.min()} max={s.max()} mean={s.mean():.2f} sum={s.sum()}"

        if df[col].dtype == pl.Utf8:
            sample = df[col].drop_nulls().head(5).to_list()
            info += f' samples={sample}'

        lines.append(info)

    lines.append("")
    lines.append("FIRST 15 ROWS:")
    for row in df.head(15).to_dicts():
        lines.append(json.dumps(row, default=str, ensure_ascii=False))

    if len(df) > 15:
        lines.append("")
        lines.append("LAST 5 ROWS:")
        for row in df.tail(5).to_dicts():
            lines.append(json.dumps(row, default=str, ensure_ascii=False))

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# 1) AI Business Type Detection
# ---------------------------------------------------------------------------

def ai_detect_business_type(df: pl.DataFrame) -> str:
    """Use Gemini to intelligently detect the business domain."""
    context = _build_full_document_context(df)

    result = _call_gemini(
        system_prompt=(
            "You are a business domain classifier. Based on the dataset provided, "
            "determine what type of business or industry this data belongs to. "
            "Return ONLY a JSON object with these fields:\n"
            '  "business_type": "<specific type like Retail, Finance, HR, Marketing, F&B, Manufacturing, Healthcare, Education, Real Estate, etc>",\n'
            '  "confidence": "<high/medium/low>",\n'
            '  "reasoning": "<1 sentence why>"\n'
            "Return ONLY the JSON, no other text."
        ),
        user_prompt=context,
    )
    parsed = _parse_json_response(result)
    if parsed and isinstance(parsed, dict) and "business_type" in parsed:
        return parsed["business_type"]

    return _fallback_detect_business_type(df)


def _fallback_detect_business_type(df: pl.DataFrame) -> str:
    """Keyword-based fallback when Gemini is unavailable."""
    keywords = {
        "Retail / E-commerce": ["product", "sku", "price", "quantity", "order", "customer", "sale", "revenue", "discount", "cart", "shipping"],
        "Finance / Accounting": ["debit", "credit", "balance", "account", "transaction", "ledger", "invoice", "tax", "profit", "loss", "asset", "liability"],
        "Human Resources": ["employee", "salary", "department", "hire", "position", "payroll", "leave", "attendance"],
        "Marketing": ["campaign", "impression", "click", "conversion", "ctr", "bounce", "engagement", "lead", "channel"],
        "Food & Beverage": ["menu", "restaurant", "food", "beverage", "recipe", "ingredient", "serving", "dine", "cafe", "makanan", "minuman"],
        "Operations / Logistics": ["shipment", "warehouse", "inventory", "delivery", "supplier", "stock", "tracking"],
        "Healthcare": ["patient", "diagnosis", "treatment", "prescription", "hospital", "doctor", "medical"],
        "Education": ["student", "grade", "course", "teacher", "class", "semester", "school", "university"],
        "Real Estate": ["property", "tenant", "rent", "building", "unit", "lease", "square", "meter"],
    }

    text_pool = " ".join(df.columns).lower()
    for col in df.columns:
        if df[col].dtype == pl.Utf8:
            vals = df[col].drop_nulls().head(100).to_list()
            text_pool += " " + " ".join(str(v).lower() for v in vals)

    scores = {bt: sum(1 for kw in kws if kw in text_pool) for bt, kws in keywords.items()}
    best = max(scores, key=scores.get)
    return best if scores[best] >= 2 else "General Business"


# ---------------------------------------------------------------------------
# 2) AI KPI Extraction
# ---------------------------------------------------------------------------

def ai_calculate_kpis(df: pl.DataFrame, business_type: str) -> list[dict]:
    """Use Gemini to identify and calculate meaningful business KPIs."""
    context = _build_full_document_context(df)

    result = _call_gemini(
        system_prompt=(
            "You are a senior business analyst. Given this dataset, identify the most important "
            "business KPIs (Key Performance Indicators) relevant to this data.\n\n"
            "Return a JSON array of 4-8 KPIs. Each KPI must have:\n"
            '  "name": "<clear KPI name, e.g. Total Revenue, Average Order Value, Employee Count>",\n'
            '  "value": <number>,\n'
            '  "type": "<one of: currency, number, percentage, count>",\n'
            '  "icon": "<one of: dollar, trending, hash, percent, rows, columns, sum>",\n'
            '  "description": "<1 sentence explaining what this KPI means>"\n\n'
            "IMPORTANT: Calculate real values from the data. Do NOT make up numbers. "
            "If the data has financial fields, compute totals/averages. "
            "If it has text data, count categories, find distributions. "
            "Return ONLY the JSON array."
        ),
        user_prompt=f"Business Type: {business_type}\n\n{context}",
    )
    parsed = _parse_json_response(result)
    if parsed and isinstance(parsed, list) and len(parsed) > 0:
        return parsed

    return _fallback_kpis(df, business_type)


def _fallback_kpis(df: pl.DataFrame, business_type: str) -> list[dict]:
    kpis = [
        {"name": "Total Records", "value": len(df), "type": "count", "icon": "rows"},
        {"name": "Data Fields", "value": len(df.columns), "type": "count", "icon": "columns"},
    ]

    numeric_cols = [c for c in df.columns if df[c].dtype in (pl.Float64, pl.Float32, pl.Int64, pl.Int32)]
    for col in numeric_cols[:4]:
        s = df[col].drop_nulls().cast(pl.Float64)
        if len(s) == 0:
            continue
        total = float(s.sum())
        mean = float(s.mean())
        col_lower = col.lower()
        if any(kw in col_lower for kw in ["revenue", "sales", "total", "amount", "income", "harga", "price"]):
            kpis.append({"name": f"Total {col}", "value": round(total, 2), "type": "currency", "icon": "dollar"})
            kpis.append({"name": f"Avg {col}", "value": round(mean, 2), "type": "currency", "icon": "trending"})
        else:
            kpis.append({"name": f"Total {col}", "value": round(total, 2), "type": "number", "icon": "sum"})

    text_cols = [c for c in df.columns if df[c].dtype == pl.Utf8]
    for col in text_cols[:2]:
        unique = df[col].n_unique()
        kpis.append({"name": f"Unique {col}", "value": unique, "type": "count", "icon": "hash"})

    return kpis[:10]


# ---------------------------------------------------------------------------
# 3) AI Full Business Analysis (insights + recommendations + summary)
# ---------------------------------------------------------------------------

def ai_full_analysis(
    df: pl.DataFrame,
    business_type: str,
    kpis: list[dict],
) -> dict[str, Any]:
    """
    Use Gemini to perform a FULL business analysis in one call.
    Returns: {summary, insights, recommendations, trends}
    """
    context = _build_full_document_context(df)

    kpi_text = "\n".join(f"  - {k['name']}: {k['value']}" for k in kpis)

    result = _call_gemini(
        system_prompt=(
            "You are a world-class business analyst consultant. "
            "A client has uploaded their business data. Your job is to:\n"
            "1. Understand what this business does\n"
            "2. Find key patterns, strengths, and problems\n"
            "3. Give actionable business advice\n\n"
            "Return a JSON object with EXACTLY these fields:\n\n"
            '"summary": "<2-3 sentence executive summary of the business and data>",\n\n'
            '"insights": [array of 4-6 objects, each with:\n'
            '  "title": "<short heading>",\n'
            '  "description": "<2-3 sentences with specific numbers from the data>",\n'
            '  "severity": "<info|warning|critical|success>",\n'
            '  "category": "<e.g. Revenue, Operations, Risk, Growth, Efficiency, Cost, Quality>"\n'
            '],\n\n'
            '"recommendations": [array of 3-5 objects, each with:\n'
            '  "title": "<action title>",\n'
            '  "description": "<2-3 sentences of specific, actionable advice based on the data>",\n'
            '  "priority": "<high|medium|low>",\n'
            '  "impact": "<expected outcome>"\n'
            '],\n\n'
            '"trends": [array of 1-3 objects with:\n'
            '  "column": "<field name>",\n'
            '  "direction": "<up|down|stable>",\n'
            '  "change_percent": <number>,\n'
            '  "description": "<what this trend means for the business>"\n'
            ']\n\n'
            "CRITICAL: Base ALL analysis on the actual data provided. "
            "Reference specific numbers, column names, and values. "
            "Do NOT give generic advice. Be specific to THIS business. "
            "Return ONLY the JSON object, no markdown or extra text."
        ),
        user_prompt=(
            f"Business Type: {business_type}\n\n"
            f"KPIs Already Calculated:\n{kpi_text}\n\n"
            f"FULL DATA:\n{context}"
        ),
        temperature=0.4,
    )

    parsed = _parse_json_response(result)
    if parsed and isinstance(parsed, dict):
        return {
            "summary": parsed.get("summary", ""),
            "insights": parsed.get("insights", []),
            "recommendations": parsed.get("recommendations", []),
            "trends": parsed.get("trends", []),
        }

    return _fallback_full_analysis(df, business_type, kpis)


def _fallback_full_analysis(
    df: pl.DataFrame,
    business_type: str,
    kpis: list[dict],
) -> dict[str, Any]:
    """Rich rule-based fallback when Gemini is not available."""

    numeric_cols = [c for c in df.columns if df[c].dtype in (pl.Float64, pl.Float32, pl.Int64, pl.Int32)]
    text_cols = [c for c in df.columns if df[c].dtype == pl.Utf8]

    summary_parts = [f"This {business_type} dataset contains {len(df)} records across {len(df.columns)} fields."]
    if numeric_cols:
        summary_parts.append(f"Numeric fields: {', '.join(numeric_cols[:5])}.")
    if text_cols:
        summary_parts.append(f"Categorical fields: {', '.join(text_cols[:5])}.")
    currency_kpis = [k for k in kpis if k.get("type") == "currency"]
    if currency_kpis:
        summary_parts.append(f"Key financial metric: {currency_kpis[0]['name']} = {currency_kpis[0]['value']:,.2f}.")

    insights = []
    null_total = sum(df[c].null_count() for c in df.columns)
    null_pct = null_total / (len(df) * len(df.columns)) * 100 if len(df) > 0 else 0

    insights.append({
        "title": f"{business_type} Data Analysis",
        "description": f"Dataset covers {len(df)} records with {len(df.columns)} data fields. {len(numeric_cols)} numeric and {len(text_cols)} categorical columns detected.",
        "severity": "info",
        "category": "Overview",
    })

    if null_pct > 10:
        insights.append({"title": "Data Quality Issue", "description": f"{null_pct:.1f}% missing values detected. This can skew analysis results and needs attention.", "severity": "warning", "category": "Data Quality"})
    else:
        insights.append({"title": "Good Data Completeness", "description": f"Only {null_pct:.1f}% missing values. Data quality is solid for analysis.", "severity": "success", "category": "Data Quality"})

    for col in text_cols[:2]:
        unique = df[col].n_unique()
        top_val = df[col].drop_nulls().mode().to_list()
        top = top_val[0] if top_val else "N/A"
        insights.append({
            "title": f"{col} Distribution",
            "description": f"Found {unique} unique values in '{col}'. Most common: '{top}'. This distribution reveals the primary segments in your business.",
            "severity": "info",
            "category": "Segmentation",
        })

    trends = []
    for col in numeric_cols[:3]:
        series = df[col].drop_nulls().cast(pl.Float64)
        if len(series) < 4:
            continue
        half = len(series) // 2
        first = series[:half].mean()
        second = series[half:].mean()
        if first and first != 0:
            pct = ((second - first) / abs(first)) * 100
            direction = "up" if pct > 5 else "down" if pct < -5 else "stable"
            trends.append({"column": col, "direction": direction, "change_percent": round(pct, 1), "description": f"{col} {'increased' if direction == 'up' else 'decreased' if direction == 'down' else 'remained stable'} by {abs(round(pct, 1))}% across the dataset."})
            if direction != "stable":
                insights.append({"title": f"{'Growth' if direction == 'up' else 'Decline'} in {col}", "description": f"{col} changed by {round(pct, 1)}% from first to second half of data.", "severity": "success" if direction == "up" else "warning", "category": "Trend"})

    recommendations = [
        {"title": "Enable AI Analysis", "description": "Add your Gemini API key to backend/.env for intelligent business analysis. The AI will understand your specific business context and give targeted advice.", "priority": "high", "impact": "10x better insights quality"},
        {"title": "Use Structured Data Files", "description": "For best results, upload Excel or CSV files with clear column headers. This allows the system to calculate precise KPIs.", "priority": "medium", "impact": "More accurate analysis"},
        {"title": "Regular Monitoring", "description": f"Upload updated {business_type} data periodically to track changes and catch issues early.", "priority": "medium", "impact": "Proactive decision-making"},
    ]

    return {
        "summary": " ".join(summary_parts),
        "insights": insights[:6],
        "recommendations": recommendations,
        "trends": trends,
    }


# ---------------------------------------------------------------------------
# Legacy API compatibility
# ---------------------------------------------------------------------------

def generate_insights(df, business_type, kpis, trends) -> list[dict[str, Any]]:
    analysis = ai_full_analysis(df, business_type, kpis)
    return analysis.get("insights", [])


def generate_recommendations(df, business_type, kpis, insights) -> list[dict[str, Any]]:
    analysis = ai_full_analysis(df, business_type, kpis)
    return analysis.get("recommendations", [])
