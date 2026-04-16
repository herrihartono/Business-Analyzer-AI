"""
Legacy analyzer module - kept for fallback compatibility.
Primary analysis is now done by ai_engine.py using OpenAI.
"""
from __future__ import annotations

import polars as pl

BUSINESS_TYPE_KEYWORDS: dict[str, list[str]] = {
    "Retail / E-commerce": [
        "product", "sku", "price", "quantity", "order", "customer",
        "sale", "revenue", "discount", "cart", "shipping", "toko", "barang", "jual",
    ],
    "Finance / Accounting": [
        "debit", "credit", "balance", "account", "transaction", "ledger",
        "invoice", "tax", "profit", "loss", "asset", "liability", "keuangan", "neraca",
    ],
    "Human Resources": [
        "employee", "salary", "department", "hire", "position",
        "payroll", "leave", "attendance", "performance", "karyawan", "gaji",
    ],
    "Marketing": [
        "campaign", "impression", "click", "conversion", "ctr",
        "bounce", "engagement", "lead", "channel", "ad", "iklan",
    ],
    "Food & Beverage": [
        "menu", "restaurant", "food", "beverage", "recipe", "ingredient",
        "serving", "cafe", "makanan", "minuman", "restoran", "masakan",
    ],
    "Operations / Logistics": [
        "shipment", "warehouse", "inventory", "delivery", "supplier",
        "stock", "tracking", "logistics", "fulfillment", "gudang", "pengiriman",
    ],
    "Healthcare": [
        "patient", "diagnosis", "treatment", "prescription", "hospital",
        "doctor", "medical", "health", "clinical", "pasien", "rumah sakit",
    ],
    "Education": [
        "student", "grade", "course", "teacher", "class", "semester",
        "school", "university", "siswa", "nilai", "sekolah",
    ],
    "Real Estate": [
        "property", "tenant", "rent", "building", "unit", "lease",
        "square", "meter", "properti", "sewa",
    ],
}


def detect_business_type(df: pl.DataFrame) -> str:
    text_pool = " ".join(df.columns).lower()
    for col in df.columns:
        if df[col].dtype == pl.Utf8:
            vals = df[col].drop_nulls().head(100).to_list()
            text_pool += " " + " ".join(str(v).lower() for v in vals)

    scores = {bt: sum(1 for kw in kws if kw in text_pool) for bt, kws in BUSINESS_TYPE_KEYWORDS.items()}
    best = max(scores, key=scores.get)
    return best if scores[best] >= 2 else "General Business"


def calculate_kpis(df: pl.DataFrame, business_type: str) -> list[dict]:
    kpis: list[dict] = []
    numeric_cols = [c for c in df.columns if df[c].dtype in (pl.Float64, pl.Float32, pl.Int64, pl.Int32)]

    kpis.append({"name": "Total Records", "value": len(df), "type": "count", "icon": "rows"})
    kpis.append({"name": "Data Fields", "value": len(df.columns), "type": "count", "icon": "columns"})

    for col in numeric_cols[:6]:
        series = df[col].drop_nulls().cast(pl.Float64)
        if len(series) == 0:
            continue
        total = float(series.sum())
        mean = float(series.mean())
        col_lower = col.lower()
        if any(kw in col_lower for kw in ["revenue", "sales", "total", "amount", "income", "harga", "price"]):
            kpis.append({"name": f"Total {col}", "value": round(total, 2), "type": "currency", "icon": "dollar"})
            kpis.append({"name": f"Avg {col}", "value": round(mean, 2), "type": "currency", "icon": "trending"})
        elif any(kw in col_lower for kw in ["count", "quantity", "qty", "units", "jumlah"]):
            kpis.append({"name": f"Total {col}", "value": round(total), "type": "number", "icon": "hash"})
        else:
            kpis.append({"name": f"Sum {col}", "value": round(total, 2), "type": "number", "icon": "sum"})

    text_cols = [c for c in df.columns if df[c].dtype == pl.Utf8]
    for col in text_cols[:2]:
        unique = df[col].n_unique()
        kpis.append({"name": f"Unique {col}", "value": unique, "type": "count", "icon": "hash"})

    return kpis[:12]


def detect_trends(df: pl.DataFrame) -> list[dict]:
    trends: list[dict] = []
    numeric_cols = [c for c in df.columns if df[c].dtype in (pl.Float64, pl.Float32, pl.Int64, pl.Int32)]
    for col in numeric_cols[:5]:
        series = df[col].drop_nulls().cast(pl.Float64)
        if len(series) < 4:
            continue
        half = len(series) // 2
        first = series[:half].mean()
        second = series[half:].mean()
        if first is None or second is None or first == 0:
            continue
        pct = ((second - first) / abs(first)) * 100
        direction = "up" if pct > 5 else "down" if pct < -5 else "stable"
        trends.append({"column": col, "direction": direction, "change_percent": round(pct, 1)})
    return trends


def generate_summary(df: pl.DataFrame, business_type: str, kpis: list[dict], trends: list[dict]) -> str:
    lines = [f"Dataset contains {len(df)} records across {len(df.columns)} columns.", f"Detected business domain: {business_type}."]
    currency_kpis = [k for k in kpis if k["type"] == "currency"]
    if currency_kpis:
        lines.append(f"Key financial metric: {currency_kpis[0]['name']} = {currency_kpis[0]['value']:,.2f}")
    return " ".join(lines)
