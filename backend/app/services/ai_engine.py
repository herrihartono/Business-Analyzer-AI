from __future__ import annotations

import hashlib
import json
import logging
from typing import Any

import groq
import polars as pl
import redis as sync_redis

from app.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

_sync_pool: sync_redis.Redis | None = None
_LLM_CACHE_TTL = 60 * 60 * 12  # 12 hours
_groq_client: groq.Groq | None = None


def _get_groq_client() -> groq.Groq | None:
    global _groq_client
    if _groq_client is None and settings.groq_api_key:
        _groq_client = groq.Groq(api_key=settings.groq_api_key)
    return _groq_client


def _get_sync_redis() -> sync_redis.Redis | None:
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
    return f"llm:{hashlib.sha256(raw.encode()).hexdigest()[:16]}"


def has_groq() -> bool:
    return bool(settings.groq_api_key and settings.groq_api_key.strip())


# ---------------------------------------------------------------------------
# Core Groq call functions
# ---------------------------------------------------------------------------

def _call_groq(
    system_prompt: str,
    user_prompt: str,
    temperature: float = 0.3,
) -> str | None:
    """Call Groq and return plain text response with Redis caching."""
    if not has_groq():
        return None

    r = _get_sync_redis()
    cache_k = _cache_key(system_prompt, user_prompt)
    if r:
        try:
            cached = r.get(cache_k)
            if cached:
                logger.info("Redis cache HIT (%s)", cache_k)
                return cached
        except Exception:
            pass

    try:
        client = _get_groq_client()
        if not client:
            return None
            
        response = client.chat.completions.create(
            model=settings.groq_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=temperature,
        )
        result = response.choices[0].message.content

        if r and result:
            try:
                r.set(cache_k, result, ex=_LLM_CACHE_TTL)
            except Exception:
                pass

        return result
    except Exception as e:
        logger.warning("Groq call failed: %s", e)
        return None


def _call_groq_json(
    system_prompt: str,
    user_prompt: str,
    temperature: float = 0.3,
) -> Any | None:
    """Call Groq with JSON response mode for reliable structured output."""
    if not has_groq():
        return None

    r = _get_sync_redis()
    cache_k = _cache_key(system_prompt, user_prompt)
    if r:
        try:
            cached = r.get(cache_k)
            if cached:
                logger.info("Redis cache HIT (%s)", cache_k)
                return json.loads(cached)
        except Exception:
            pass

    try:
        client = _get_groq_client()
        if not client:
            return None

        response = client.chat.completions.create(
            model=settings.groq_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=temperature,
            response_format={"type": "json_object"},
        )
        text = response.choices[0].message.content

        if r and text:
            try:
                r.set(cache_k, text, ex=_LLM_CACHE_TTL)
            except Exception:
                pass

        return json.loads(text)
    except json.JSONDecodeError:
        logger.warning("Groq returned invalid JSON, falling back to text parse")
        return _parse_json_response(text if 'text' in locals() else None)
    except Exception as e:
        logger.warning("Groq JSON call failed: %s", e)
        return None


def _parse_json_response(text: str | None) -> Any:
    """Fallback JSON parser that strips markdown fences."""
    if not text:
        return None
    try:
        cleaned = text.strip()
        if cleaned.startswith("```"):
            lines = cleaned.split("\n")
            lines = [ln for ln in lines if not ln.strip().startswith("```")]
            cleaned = "\n".join(lines)
        return json.loads(cleaned)
    except json.JSONDecodeError:
        return None


# ---------------------------------------------------------------------------
# Data context builder
# ---------------------------------------------------------------------------

def _build_full_document_context(df: pl.DataFrame) -> str:
    """Build a rich text representation of the data for the LLM."""
    lines: list[str] = []
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
            info += f" samples={sample}"

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
    """Use Groq JSON mode to detect the business domain."""
    context = _build_full_document_context(df)

    parsed = _call_groq_json(
        system_prompt=(
            "You are a business domain classifier. Based on the dataset provided, "
            "determine what type of business or industry this data belongs to.\n\n"
            "Return a JSON object with these fields:\n"
            '  "business_type": "<specific type like Retail, Finance, HR, Marketing, '
            'F&B, Manufacturing, Healthcare, Education, Real Estate, etc>",\n'
            '  "confidence": "<high|medium|low>",\n'
            '  "reasoning": "<1 sentence why>"'
        ),
        user_prompt=context,
    )
    if parsed and isinstance(parsed, dict) and "business_type" in parsed:
        return parsed["business_type"]

    return _fallback_detect_business_type(df)


def _fallback_detect_business_type(df: pl.DataFrame) -> str:
    """Keyword-based fallback when Groq is unavailable."""
    keywords = {
        "Retail / E-commerce": [
            "product", "sku", "price", "quantity", "order", "customer",
            "sale", "revenue", "discount", "cart", "shipping",
        ],
        "Finance / Accounting": [
            "debit", "credit", "balance", "account", "transaction",
            "ledger", "invoice", "tax", "profit", "loss", "asset", "liability",
        ],
        "Human Resources": [
            "employee", "salary", "department", "hire", "position",
            "payroll", "leave", "attendance",
        ],
        "Marketing": [
            "campaign", "impression", "click", "conversion", "ctr",
            "bounce", "engagement", "lead", "channel",
        ],
        "Food & Beverage": [
            "menu", "restaurant", "food", "beverage", "recipe",
            "ingredient", "serving", "dine", "cafe", "makanan", "minuman",
        ],
        "Operations / Logistics": [
            "shipment", "warehouse", "inventory", "delivery", "supplier",
            "stock", "tracking",
        ],
        "Healthcare": [
            "patient", "diagnosis", "treatment", "prescription",
            "hospital", "doctor", "medical",
        ],
        "Education": [
            "student", "grade", "course", "teacher", "class",
            "semester", "school", "university",
        ],
        "Real Estate": [
            "property", "tenant", "rent", "building", "unit",
            "lease", "square", "meter",
        ],
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
    """Use Groq JSON mode to identify and calculate meaningful business KPIs."""
    context = _build_full_document_context(df)

    parsed = _call_groq_json(
        system_prompt=(
            "You are a senior business analyst. Given this dataset, identify the most "
            "important business KPIs (Key Performance Indicators) relevant to this data.\n\n"
            "Return a JSON object with a single key \"kpis\" containing an array of 4-8 KPI objects.\n"
            "Each KPI object must have:\n"
            '  "name": "<clear KPI name, e.g. Total Revenue, Average Order Value>",\n'
            '  "value": <number — calculate real values from the data>,\n'
            '  "type": "<one of: currency, number, percentage, count>",\n'
            '  "icon": "<one of: dollar, trending, hash, percent, rows, columns, sum>",\n'
            '  "description": "<1 sentence explaining what this KPI means>"\n\n'
            "IMPORTANT: Calculate real values from the data provided. Do NOT make up numbers.\n"
            "Assume all monetary values are in Indonesian Rupiah (IDR) unless specified otherwise."
        ),
        user_prompt=f"Business Type: {business_type}\n\n{context}",
    )

    if parsed and isinstance(parsed, dict) and "kpis" in parsed:
        return parsed["kpis"]
    if parsed and isinstance(parsed, list) and len(parsed) > 0:
        return parsed

    return _fallback_kpis(df, business_type)


def _fallback_kpis(df: pl.DataFrame, business_type: str) -> list[dict]:
    kpis: list[dict] = [
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
    Use Groq JSON mode to perform a full business analysis in one call.
    Returns: {summary, insights, recommendations, trends}
    """
    context = _build_full_document_context(df)
    kpi_text = "\n".join(f"  - {k['name']}: {k['value']}" for k in kpis)

    parsed = _call_groq_json(
        system_prompt=(
            "Anda adalah seorang Senior Business Analyst dengan pengalaman 15+ tahun di berbagai industri "
            "(startup, teknologi, retail, finansial, manufaktur, dan enterprise).\n\n"
            "Anda berpikir seperti konsultan strategi top-tier dan operator bisnis nyata — bukan teoritis. "
            "Tugas Anda adalah memberikan analisis yang tajam, realistis, dan bisa langsung dieksekusi. "
            "Jangan bersikap menyenangkan atau diplomatis. Fokus pada kebenaran dan dampak bisnis. "
            "Gunakan Bahasa Indonesia yang jelas, tegas, dan langsung ke inti.\n\n"
            "Analisis data bisnis yang diberikan dan kembalikan JSON dengan TEPAT field berikut:\n\n"
            '"summary": "<Ringkasan eksekutif 2-3 kalimat: apa bisnis ini, kondisi datanya, dan temuan kritis>",\n\n'
            '"insights": [array 4-6 objek, masing-masing dengan:\n'
            '  "title": "<judul singkat dan tajam>",\n'
            '  "description": "<2-3 kalimat dengan angka spesifik dari data, jujur dan langsung>",\n'
            '  "severity": "<info|warning|critical|success>",\n'
            '  "category": "<salah satu: Revenue, Operasional, Risiko, Pertumbuhan, Efisiensi, Biaya, Kualitas Data, Pasar>"\n'
            '],\n\n'
            '"recommendations": [array 3-5 objek, masing-masing dengan:\n'
            '  "title": "<judul aksi yang konkret>",\n'
            '  "description": "<2-3 kalimat saran spesifik dan bisa langsung dieksekusi berdasarkan data>",\n'
            '  "priority": "<high|medium|low>",\n'
            '  "impact": "<dampak bisnis yang diharapkan>"\n'
            '],\n\n'
            '"trends": [array 1-3 objek dengan:\n'
            '  "column": "<nama field>",\n'
            '  "direction": "<up|down|stable>",\n'
            '  "change_percent": <angka>,\n'
            '  "description": "<apa arti tren ini bagi bisnis dalam Bahasa Indonesia>"\n'
            "]\n\n"
            "ATURAN WAJIB:\n"
            "- Hindari jawaban generik, selalu referensi angka dan nama kolom spesifik dari data\n"
            "- Jangan beri motivasi kosong, fokus pada fakta dan dampak nyata\n"
            "- Jika ada masalah serius, katakan secara langsung\n"
            "- Semua teks HARUS dalam Bahasa Indonesia\n"
            "- Jangan gunakan placeholder, semua analisis berdasarkan data aktual yang diberikan\n"
            "- Semua nilai uang atau mata uang HARUS secara eksplisit diformat dalam Rupiah (IDR)"
        ),
        user_prompt=(
            f"Tipe Bisnis: {business_type}\n\n"
            f"KPI yang Sudah Dihitung:\n{kpi_text}\n\n"
            f"DATA LENGKAP:\n{context}"
        ),
        temperature=0.4,
    )

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
    """Rich rule-based fallback when Groq is not available."""
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

    insights: list[dict] = []
    null_total = sum(df[c].null_count() for c in df.columns)
    null_pct = null_total / (len(df) * len(df.columns)) * 100 if len(df) > 0 else 0

    insights.append({
        "title": f"{business_type} Data Analysis",
        "description": (
            f"Dataset covers {len(df)} records with {len(df.columns)} data fields. "
            f"{len(numeric_cols)} numeric and {len(text_cols)} categorical columns detected."
        ),
        "severity": "info",
        "category": "Overview",
    })

    if null_pct > 10:
        insights.append({
            "title": "Data Quality Issue",
            "description": f"{null_pct:.1f}% missing values detected. This can skew analysis results and needs attention.",
            "severity": "warning",
            "category": "Data Quality",
        })
    else:
        insights.append({
            "title": "Good Data Completeness",
            "description": f"Only {null_pct:.1f}% missing values. Data quality is solid for analysis.",
            "severity": "success",
            "category": "Data Quality",
        })

    for col in text_cols[:2]:
        unique = df[col].n_unique()
        top_val = df[col].drop_nulls().mode().to_list()
        top = top_val[0] if top_val else "N/A"
        insights.append({
            "title": f"{col} Distribution",
            "description": (
                f"Found {unique} unique values in '{col}'. Most common: '{top}'. "
                "This distribution reveals the primary segments in your business."
            ),
            "severity": "info",
            "category": "Segmentation",
        })

    trends: list[dict] = []
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
            label = "increased" if direction == "up" else "decreased" if direction == "down" else "remained stable"
            trends.append({
                "column": col,
                "direction": direction,
                "change_percent": round(pct, 1),
                "description": f"{col} {label} by {abs(round(pct, 1))}% across the dataset.",
            })
            if direction != "stable":
                insights.append({
                    "title": f"{'Growth' if direction == 'up' else 'Decline'} in {col}",
                    "description": f"{col} changed by {round(pct, 1)}% from first to second half of data.",
                    "severity": "success" if direction == "up" else "warning",
                    "category": "Trend",
                })

    recommendations = [
        {
            "title": "Upload More Data",
            "description": "Provide larger datasets with more historical records for deeper trend analysis and more accurate forecasting.",
            "priority": "high",
            "impact": "Significantly better insights quality",
        },
        {
            "title": "Use Structured Data Files",
            "description": "For best results, upload Excel or CSV files with clear column headers. This allows the system to calculate precise KPIs.",
            "priority": "medium",
            "impact": "More accurate analysis",
        },
        {
            "title": "Regular Monitoring",
            "description": f"Upload updated {business_type} data periodically to track changes and catch issues early.",
            "priority": "medium",
            "impact": "Proactive decision-making",
        },
    ]

    return {
        "summary": " ".join(summary_parts),
        "insights": insights[:6],
        "recommendations": recommendations,
        "trends": trends,
    }


# ---------------------------------------------------------------------------
# 4) Chat / Q&A
# ---------------------------------------------------------------------------

def generate_chat_response(question: str, context: str, business_type: str) -> str:
    """Generate a chat answer about analysis data using Groq."""
    result = _call_groq(
        system_prompt=(
            "Anda adalah seorang Senior Business Analyst dengan pengalaman 15+ tahun di berbagai industri. "
            "Anda berpikir seperti konsultan strategi top-tier — tajam, realistis, langsung ke inti. "
            f"Anda sedang membantu menganalisis bisnis tipe {business_type}. "
            "Jawab pertanyaan pengguna berdasarkan data analisis yang diberikan. "
            "Selalu referensi angka spesifik, nama kolom, dan nilai aktual dari data. "
            "Jangan beri jawaban generik atau motivasi kosong — fokus pada fakta dan dampak bisnis nyata. "
            "Jika ada masalah serius dalam data, katakan secara langsung. "
            "Berikan saran yang bisa langsung dieksekusi jika relevan. "
            "Gunakan Bahasa Indonesia yang jelas, tegas, dan profesional. "
            "Semua nilai uang atau mata uang HARUS diformat dalam Rupiah (IDR). "
            "Jawab dengan ringkas namun substansial (2-5 kalimat)."
        ),
        user_prompt=f"DATA ANALISIS:\n{context}\n\nPERTANYAAN: {question}",
    )
    return result or "Maaf, saya tidak dapat memproses pertanyaan tersebut. Silakan coba dengan pertanyaan yang lebih spesifik."


# ---------------------------------------------------------------------------
# Legacy API compatibility
# ---------------------------------------------------------------------------

def generate_insights(df: pl.DataFrame, business_type: str, kpis: list[dict], trends: Any) -> list[dict[str, Any]]:
    analysis = ai_full_analysis(df, business_type, kpis)
    return analysis.get("insights", [])


def generate_recommendations(df: pl.DataFrame, business_type: str, kpis: list[dict], insights: Any) -> list[dict[str, Any]]:
    analysis = ai_full_analysis(df, business_type, kpis)
    return analysis.get("recommendations", [])
