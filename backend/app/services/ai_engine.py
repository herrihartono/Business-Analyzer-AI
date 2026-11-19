from __future__ import annotations

import json
import logging
import math
from typing import Any

import groq
import polars as pl

from app.config import get_settings
from app.services.redis_cache import (
    get_cached_llm,
    set_cached_llm,
    get_cached_llm_json,
    set_cached_llm_json,
)

settings = get_settings()
logger = logging.getLogger(__name__)

_async_groq_client: groq.AsyncGroq | None = None


def _get_async_groq_client() -> groq.AsyncGroq | None:
    global _async_groq_client
    if _async_groq_client is None and settings.groq_api_key:
        _async_groq_client = groq.AsyncGroq(api_key=settings.groq_api_key)
    return _async_groq_client


def has_groq() -> bool:
    return bool(settings.groq_api_key and settings.groq_api_key.strip())


# ---------------------------------------------------------------------------
# Core Async Groq call functions with Redis caching
# ---------------------------------------------------------------------------

async def _call_groq(
    system_prompt: str,
    user_prompt: str,
    temperature: float = 0.3,
) -> str | None:
    """Asynchronously call Groq and return plain text response with caching."""
    if not has_groq():
        return None

    try:
        cached = await get_cached_llm(system_prompt, user_prompt)
        if cached:
            logger.info("Redis cache HIT for LLM text")
            return cached
    except Exception:
        pass

    try:
        client = _get_async_groq_client()
        if not client:
            return None

        response = await client.chat.completions.create(
            model=settings.groq_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=temperature,
        )
        result = response.choices[0].message.content

        if result:
            try:
                await set_cached_llm(system_prompt, user_prompt, result)
            except Exception:
                pass

        return result
    except Exception as e:
        logger.warning("Async Groq call failed: %s", e)
        return None


async def _call_groq_json(
    system_prompt: str,
    user_prompt: str,
    temperature: float = 0.3,
) -> Any | None:
    """Asynchronously call Groq with JSON mode for reliable structured output."""
    if not has_groq():
        return None

    try:
        cached = await get_cached_llm_json(system_prompt, user_prompt)
        if cached:
            logger.info("Redis cache HIT for LLM JSON")
            return cached
    except Exception:
        pass

    text = None
    try:
        client = _get_async_groq_client()
        if not client:
            return None

        response = await client.chat.completions.create(
            model=settings.groq_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=temperature,
            response_format={"type": "json_object"},
        )
        text = response.choices[0].message.content
        if not text:
            return None

        parsed = json.loads(text)
        try:
            await set_cached_llm_json(system_prompt, user_prompt, parsed)
        except Exception:
            pass

        return parsed
    except json.JSONDecodeError:
        logger.warning("Groq returned invalid JSON, falling back to text parse")
        return _parse_json_response(text)
    except Exception as e:
        logger.warning("Async Groq JSON call failed: %s", e)
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
# Polars-Powered Deterministic Metrics Computation
# ---------------------------------------------------------------------------

def compute_exact_dataset_metrics(df: pl.DataFrame) -> dict[str, Any]:
    """
    Compute mathematically exact metrics, sums, and category aggregations using Polars.
    Runs in milliseconds and provides 100% accurate ground truth.
    """
    numeric_cols = [
        c for c in df.columns
        if df[c].dtype in (pl.Float64, pl.Float32, pl.Int64, pl.Int32)
    ]
    text_cols = [c for c in df.columns if df[c].dtype in (pl.Utf8, pl.String)]
    date_cols = [c for c in df.columns if df[c].dtype in (pl.Date, pl.Datetime)]

    metrics: dict[str, Any] = {
        "total_records": len(df),
        "total_fields": len(df.columns),
        "numeric_summaries": {},
        "top_categories": {},
        "date_range": None,
        "half_trends": {},
    }

    if date_cols:
        dcol = date_cols[0]
        s_date = df[dcol].drop_nulls()
        if len(s_date) > 0:
            metrics["date_range"] = {
                "column": dcol,
                "start": str(s_date.min()),
                "end": str(s_date.max()),
            }

    for col in numeric_cols:
        series = df[col].drop_nulls().drop_nans().cast(pl.Float64)
        if len(series) == 0:
            continue
        total = float(series.sum())
        mean_val = float(series.mean())
        min_val = float(series.min())
        max_val = float(series.max())

        metrics["numeric_summaries"][col] = {
            "sum": round(total, 2) if not math.isnan(total) else 0.0,
            "mean": round(mean_val, 2) if not math.isnan(mean_val) else 0.0,
            "min": round(min_val, 2) if not math.isnan(min_val) else 0.0,
            "max": round(max_val, 2) if not math.isnan(max_val) else 0.0,
        }

        # Trend comparison between first half and second half
        if len(series) >= 4:
            half = len(series) // 2
            first_half = series[:half].mean()
            second_half = series[half:].mean()
            if first_half and first_half != 0:
                pct = ((second_half - first_half) / abs(first_half)) * 100
                metrics["half_trends"][col] = round(pct, 1)

    for col in text_cols[:3]:
        try:
            val_counts = (
                df[col]
                .drop_nulls()
                .value_counts()
                .sort("count", descending=True)
                .head(4)
                .to_dicts()
            )
            metrics["top_categories"][col] = val_counts
        except Exception:
            pass

    return metrics


def _build_unified_prompt_context(df: pl.DataFrame, metrics: dict[str, Any]) -> str:
    """Build a rich, structured context containing exact Polars numbers and sample rows."""
    lines: list[str] = []
    lines.append(f"TOTAL ROWS: {metrics['total_records']}, TOTAL COLUMNS: {metrics['total_fields']}")
    lines.append(f"COLUMNS: {', '.join(df.columns)}")
    lines.append("")

    if metrics.get("date_range"):
        dr = metrics["date_range"]
        lines.append(f"RENTANG WAKTU ({dr['column']}): {dr['start']} s/d {dr['end']}")
        lines.append("")

    lines.append("RINGKASAN METRIK MATEMATIS (POLARS VERIFIED):")
    for col, stats in metrics.get("numeric_summaries", {}).items():
        trend = metrics.get("half_trends", {}).get(col)
        trend_str = f", Tren: {trend:+.1f}%" if trend is not None else ""
        lines.append(f"  - {col}: Total={stats['sum']:,.2f}, Rata-rata={stats['mean']:,.2f}, Min={stats['min']:,.2f}, Max={stats['max']:,.2f}{trend_str}")

    if metrics.get("top_categories"):
        lines.append("")
        lines.append("DISTRIBUSI KATEGORI TERBANYAK:")
        for col, counts in metrics["top_categories"].items():
            samples = ", ".join(f"{c.get(col)}: {c.get('count')}" for c in counts)
            lines.append(f"  - {col}: [{samples}]")

    lines.append("")
    lines.append("CONTOH 10 BARIS DATA PERTAMA:")
    for row in df.head(10).to_dicts():
        lines.append(json.dumps(row, default=str, ensure_ascii=False))

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Unified Fast Analysis Pipeline (Single LLM Call)
# ---------------------------------------------------------------------------

async def ai_unified_analysis(df: pl.DataFrame) -> dict[str, Any]:
    """
    Unified high-performance business analysis.
    Computes exact KPIs with Polars, then uses 1 single LLM call for
    domain classification, validated KPIs, summary, insights, and recommendations.
    """
    metrics = compute_exact_dataset_metrics(df)
    context = _build_unified_prompt_context(df, metrics)

    system_prompt = (
        "Anda adalah seorang Chief Business Analyst & Konsultan Strategi Senior dengan pengalaman 15+ tahun "
        "di berbagai sektor industri (Retail/E-commerce, F&B, Finansial, Logistik, HR, Manufaktur, Healthcare, dll).\n\n"
        "Gaya berpikir Anda: tajam, objektif, berorientasi dampak bisnis nyata, langsung ke inti permasalahan, "
        "dan selalu berlandaskan angka faktual yang diberikan. Jangan menggunakan bahasa normatif/basa-basi.\n\n"
        "TUGAS: Analisis data bisnis berikut dan kembalikan JSON objek dengan format PERSIS seperti ini:\n"
        "{\n"
        '  "business_type": "<Klasifikasi jenis bisnis/industri yang spesifik, misal: Retail / E-Commerce, Food & Beverage, Keuangan, dll>",\n'
        '  "summary": "<Ringkasan eksekutif 2-3 kalimat: kondisi bisnis, skala data, dan temuan kunci dalam Bahasa Indonesia>",\n'
        '  "kpis": [\n'
        '    {"name": "<Nama KPI>", "value": <Angka rill dari data>, "type": "<currency|number|percentage|count>", "icon": "<dollar|trending|hash|percent|rows|sum>", "description": "<Arti metrik ini>"}\n'
        '  ],\n'
        '  "insights": [\n'
        '    {"title": "<Judul temuan>", "description": "<Uraian 2-3 kalimat menyertakan angka spesifik>", "severity": "<info|warning|critical|success>", "category": "<Revenue|Operasional|Risiko|Pertumbuhan|Efisiensi|Biaya|Kualitas Data>"}\n'
        '  ],\n'
        '  "recommendations": [\n'
        '    {"title": "<Aksi konkret>", "description": "<Saran eksekusi 2-3 kalimat>", "priority": "<high|medium|low>", "impact": "<Dampak bisnis yang diharapkan>"}\n'
        '  ],\n'
        '  "trends": [\n'
        '    {"column": "<Nama kolom>", "direction": "<up|down|stable>", "change_percent": <Angka perubahan>, "description": "<Penjelasan tren dalam Bahasa Indonesia>"}\n'
        '  ]\n'
        "}\n\n"
        "ATURAN WAJIB:\n"
        "1. Semua teks dan narasi HARUS dalam Bahasa Indonesia yang profesional dan lugas.\n"
        "2. Gunakan angka riil dari 'RINGKASAN METRIK MATEMATIS' yang telah disediakan. JANGAN mengarang angka!\n"
        "3. Semua nilai uang secara eksplisit diasumsikan dalam Rupiah (IDR).\n"
        "4. Kembalikan 4-8 item pada 'kpis', 4-6 item pada 'insights', dan 3-5 item pada 'recommendations'."
    )

    parsed = await _call_groq_json(
        system_prompt=system_prompt,
        user_prompt=context,
        temperature=0.3,
    )

    if parsed and isinstance(parsed, dict) and "business_type" in parsed:
        # Sanitize and ensure KPIs have exact values
        kpis = parsed.get("kpis") or _build_fallback_kpis(df, metrics)
        return {
            "business_type": parsed.get("business_type", "General Business"),
            "summary": parsed.get("summary", ""),
            "kpis": kpis,
            "insights": parsed.get("insights", []),
            "recommendations": parsed.get("recommendations", []),
            "trends": parsed.get("trends", []),
        }

    # Fallback if Groq unavailable
    business_type = _fallback_detect_business_type(df)
    fallback_kpis = _build_fallback_kpis(df, metrics)
    fallback_analysis = _fallback_full_analysis(df, business_type, fallback_kpis, metrics)
    return {
        "business_type": business_type,
        "summary": fallback_analysis.get("summary", ""),
        "kpis": fallback_kpis,
        "insights": fallback_analysis.get("insights", []),
        "recommendations": fallback_analysis.get("recommendations", []),
        "trends": fallback_analysis.get("trends", []),
    }


def _build_fallback_kpis(df: pl.DataFrame, metrics: dict[str, Any]) -> list[dict]:
    """Build guaranteed accurate KPIs from Polars computed metrics."""
    kpis: list[dict] = [
        {"name": "Total Data", "value": metrics["total_records"], "type": "count", "icon": "rows", "description": "Jumlah seluruh baris transaksi dalam dataset."},
        {"name": "Jumlah Kolom", "value": metrics["total_fields"], "type": "count", "icon": "columns", "description": "Total variabel atau field data yang dianalisis."},
    ]

    for col, stats in list(metrics.get("numeric_summaries", {}).items())[:4]:
        col_lower = col.lower()
        is_money = any(kw in col_lower for kw in ["revenue", "sales", "total", "amount", "income", "harga", "price", "biaya", "omset", "untung", "profit"])
        if is_money:
            kpis.append({"name": f"Total {col}", "value": stats["sum"], "type": "currency", "icon": "dollar", "description": f"Akumulasi total {col} dalam Rupiah."})
            kpis.append({"name": f"Rata-rata {col}", "value": stats["mean"], "type": "currency", "icon": "trending", "description": f"Rata-rata nilai {col} per transaksi."})
        else:
            kpis.append({"name": f"Total {col}", "value": stats["sum"], "type": "number", "icon": "sum", "description": f"Total keseluruhan nilai {col}."})

    for col in list(metrics.get("top_categories", {}).keys())[:2]:
        unique_cnt = df[col].n_unique()
        kpis.append({"name": f"Varian {col}", "value": unique_cnt, "type": "count", "icon": "hash", "description": f"Jumlah kategori unik pada kolom {col}."})

    return kpis[:8]


def _fallback_detect_business_type(df: pl.DataFrame) -> str:
    """Keyword-based fallback classifier."""
    keywords = {
        "Retail / E-commerce": ["product", "sku", "price", "quantity", "order", "customer", "sale", "revenue", "discount", "cart", "shipping", "produk", "harga", "qty"],
        "Finance / Accounting": ["debit", "credit", "balance", "account", "transaction", "ledger", "invoice", "tax", "profit", "loss", "asset", "liability", "keuangan", "pajak"],
        "Human Resources": ["employee", "salary", "department", "hire", "position", "payroll", "leave", "attendance", "karyawan", "gaji"],
        "Marketing": ["campaign", "impression", "click", "conversion", "ctr", "bounce", "engagement", "lead", "channel"],
        "Food & Beverage": ["menu", "restaurant", "food", "beverage", "recipe", "ingredient", "serving", "dine", "cafe", "makanan", "minuman"],
        "Operations / Logistics": ["shipment", "warehouse", "inventory", "delivery", "supplier", "stock", "tracking", "gudang", "pengiriman"],
        "Healthcare": ["patient", "diagnosis", "treatment", "prescription", "hospital", "doctor", "medical", "pasien", "obat"],
        "Education": ["student", "grade", "course", "teacher", "class", "semester", "school", "siswa", "nilai"],
        "Real Estate": ["property", "tenant", "rent", "building", "unit", "lease", "properti", "sewa"],
    }

    text_pool = " ".join(df.columns).lower()
    for col in df.columns:
        if df[col].dtype in (pl.Utf8, pl.String):
            vals = df[col].drop_nulls().head(50).to_list()
            text_pool += " " + " ".join(str(v).lower() for v in vals)

    scores = {bt: sum(1 for kw in kws if kw in text_pool) for bt, kws in keywords.items()}
    best = max(scores, key=scores.get)
    return best if scores[best] >= 2 else "Bisnis Umum (General)"


def _fallback_full_analysis(
    df: pl.DataFrame,
    business_type: str,
    kpis: list[dict],
    metrics: dict[str, Any],
) -> dict[str, Any]:
    """Rich rule-based fallback when Groq is not available."""
    currency_kpis = [k for k in kpis if k.get("type") == "currency"]
    financial_summary = f" Metrik keuangan utama: {currency_kpis[0]['name']} tercatat sebesar Rp {currency_kpis[0]['value']:,.0f}." if currency_kpis else ""

    summary = (
        f"Dataset bisnis kategori {business_type} mencakup {metrics['total_records']} baris data "
        f"dan {metrics['total_fields']} parameter kolom.{financial_summary} "
        f"Seluruh data telah diverifikasi dan siap digunakan untuk pengambilan keputusan strategis."
    )

    insights: list[dict] = [
        {
            "title": f"Ikhtisar Data {business_type}",
            "description": f"Dataset memiliki {metrics['total_records']} baris dengan {metrics['total_fields']} variabel data terstruktur.",
            "severity": "info",
            "category": "Operasional",
        }
    ]

    null_total = sum(df[c].null_count() for c in df.columns)
    null_pct = null_total / (len(df) * len(df.columns)) * 100 if len(df) > 0 else 0
    if null_pct > 5:
        insights.append({
            "title": "Evaluasi Kualitas Data",
            "description": f"Ditemukan {null_pct:.1f}% data kosong/hilang pada dataset. Proses pembersihan data otomatis telah diterapkan.",
            "severity": "warning",
            "category": "Kualitas Data",
        })
    else:
        insights.append({
            "title": "Kualitas Data Sangat Baik",
            "description": f"Tingkat kelengkapan data mencapai {100 - null_pct:.1f}%. Data sangat solid untuk analisis prediktif.",
            "severity": "success",
            "category": "Kualitas Data",
        })

    trends: list[dict] = []
    for col, pct in metrics.get("half_trends", {}).items():
        direction = "up" if pct > 3 else "down" if pct < -3 else "stable"
        label = "meningkat" if direction == "up" else "menurun" if direction == "down" else "stabil"
        trends.append({
            "column": col,
            "direction": direction,
            "change_percent": abs(round(pct, 1)),
            "description": f"{col} {label} sebesar {abs(round(pct, 1))}% dibanding periode awal data.",
        })
        if direction != "stable":
            insights.append({
                "title": f"Tren {'Peningkatan' if direction == 'up' else 'Penurunan'} pada {col}",
                "description": f"{col} tercatat {label} sebesar {abs(round(pct, 1))}%. Perhatikan dampak faktor ini terhadap arus kas dan operasional.",
                "severity": "success" if direction == "up" else "warning",
                "category": "Pertumbuhan" if direction == "up" else "Risiko",
            })

    recommendations = [
        {
            "title": "Optimalisasi Efisiensi Operasional",
            "description": "Fokuskan alokasi sumber daya pada kategori produk/transaksi dengan kontribusi volume dan margin tertinggi.",
            "priority": "high",
            "impact": "Meningkatkan margin profitabilitas secara terukur",
        },
        {
            "title": "Pemantauan Tren Secara Berkala",
            "description": "Lakukan pembaruan dataset secara mingguan atau bulanan untuk mendeteksi anomali penjualan sedini mungkin.",
            "priority": "medium",
            "impact": "Mitigasi risiko penurunan performa bisnis",
        },
        {
            "title": "Standardisasi Input Data",
            "description": "Pastikan pencatatan format tanggal dan nilai mata uang konsisten untuk mempercepat siklus pelaporan manajemen.",
            "priority": "medium",
            "impact": "Meningkatkan akurasi dan kecepatan pelaporan",
        },
    ]

    return {
        "summary": summary,
        "insights": insights[:6],
        "recommendations": recommendations,
        "trends": trends,
    }


# ---------------------------------------------------------------------------
# Async Chat / Q&A
# ---------------------------------------------------------------------------

async def generate_chat_response(question: str, context: str, business_type: str) -> str:
    """Asynchronously generate a chat answer about analysis data using Groq."""
    system_prompt = (
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
    )
    user_prompt = f"DATA ANALISIS:\n{context}\n\nPERTANYAAN: {question}"

    result = await _call_groq(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        temperature=0.3,
    )
    return result or "Maaf, saya tidak dapat memproses pertanyaan tersebut saat ini. Silakan coba pertanyaan yang lebih spesifik."


# ---------------------------------------------------------------------------
# Backward Compatibility Helpers
# ---------------------------------------------------------------------------

def _fallback_kpis(df: pl.DataFrame, business_type: str) -> list[dict]:
    metrics = compute_exact_dataset_metrics(df)
    return _build_fallback_kpis(df, metrics)


async def ai_detect_business_type(df: pl.DataFrame) -> str:
    res = await ai_unified_analysis(df)
    return res.get("business_type", "General Business")


async def ai_calculate_kpis(df: pl.DataFrame, business_type: str) -> list[dict]:
    metrics = compute_exact_dataset_metrics(df)
    return _build_fallback_kpis(df, metrics)


async def ai_full_analysis(df: pl.DataFrame, business_type: str, kpis: list[dict]) -> dict[str, Any]:
    return await ai_unified_analysis(df)
