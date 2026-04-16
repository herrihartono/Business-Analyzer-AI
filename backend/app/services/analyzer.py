from __future__ import annotations

import polars as pl

BUSINESS_TYPE_KEYWORDS: dict[str, list[str]] = {
    "Retail / E-commerce": [
        "product", "sku", "price", "quantity", "order", "customer",
        "sale", "revenue", "discount", "cart", "shipping",
    ],
    "Finance / Accounting": [
        "debit", "credit", "balance", "account", "transaction", "ledger",
        "invoice", "tax", "profit", "loss", "asset", "liability",
    ],
    "Human Resources": [
        "employee", "salary", "department", "hire", "position",
        "payroll", "leave", "attendance", "performance",
    ],
    "Marketing": [
        "campaign", "impression", "click", "conversion", "ctr",
        "bounce", "engagement", "lead", "channel", "ad",
    ],
    "Operations / Logistics": [
        "shipment", "warehouse", "inventory", "delivery", "supplier",
        "stock", "tracking", "logistics", "fulfillment",
    ],
    "Healthcare": [
        "patient", "diagnosis", "treatment", "prescription", "hospital",
        "doctor", "medical", "health", "clinical",
    ],
}


def detect_business_type(df: pl.DataFrame) -> str:
    """Detect the most likely business domain from column names and sample values."""
    text_pool = " ".join(df.columns).lower()

    sample_vals = []
    for col in df.columns:
        if df[col].dtype == pl.Utf8:
            sample_vals.extend(df[col].drop_nulls().head(20).to_list())
    text_pool += " " + " ".join(str(v).lower() for v in sample_vals[:200])

    scores: dict[str, int] = {}
    for btype, keywords in BUSINESS_TYPE_KEYWORDS.items():
        scores[btype] = sum(1 for kw in keywords if kw in text_pool)

    best = max(scores, key=scores.get)  # type: ignore[arg-type]
    return best if scores[best] >= 2 else "General Business"


def calculate_kpis(df: pl.DataFrame, business_type: str) -> list[dict]:
    """Calculate KPIs based on detected business type and available columns."""
    kpis: list[dict] = []

    numeric_cols = [
        c for c in df.columns
        if df[c].dtype in (pl.Float64, pl.Float32, pl.Int64, pl.Int32)
    ]

    kpis.append({
        "name": "Total Records",
        "value": len(df),
        "type": "count",
        "icon": "rows",
    })
    kpis.append({
        "name": "Columns",
        "value": len(df.columns),
        "type": "count",
        "icon": "columns",
    })

    for col in numeric_cols[:6]:
        series = df[col].drop_nulls().cast(pl.Float64)
        if len(series) == 0:
            continue

        total = float(series.sum())  # type: ignore[arg-type]
        mean = float(series.mean())  # type: ignore[arg-type]

        col_lower = col.lower()

        if any(kw in col_lower for kw in ["revenue", "sales", "total", "amount", "income"]):
            kpis.append({
                "name": f"Total {col}",
                "value": round(total, 2),
                "type": "currency",
                "icon": "dollar",
            })
            kpis.append({
                "name": f"Avg {col}",
                "value": round(mean, 2),
                "type": "currency",
                "icon": "trending",
            })
        elif any(kw in col_lower for kw in ["count", "quantity", "qty", "units"]):
            kpis.append({
                "name": f"Total {col}",
                "value": round(total),
                "type": "number",
                "icon": "hash",
            })
        elif any(kw in col_lower for kw in ["rate", "percent", "ratio", "margin"]):
            kpis.append({
                "name": f"Avg {col}",
                "value": round(mean, 2),
                "type": "percentage",
                "icon": "percent",
            })
        else:
            kpis.append({
                "name": f"Sum {col}",
                "value": round(total, 2),
                "type": "number",
                "icon": "sum",
            })

    return kpis[:12]


def detect_trends(df: pl.DataFrame) -> list[dict]:
    """Detect basic trends in numeric columns."""
    trends: list[dict] = []
    numeric_cols = [
        c for c in df.columns
        if df[c].dtype in (pl.Float64, pl.Float32, pl.Int64, pl.Int32)
    ]

    for col in numeric_cols[:5]:
        series = df[col].drop_nulls().cast(pl.Float64)
        if len(series) < 4:
            continue

        half = len(series) // 2
        first_half_mean = series[:half].mean()
        second_half_mean = series[half:].mean()

        if first_half_mean is None or second_half_mean is None or first_half_mean == 0:
            continue

        change_pct = ((second_half_mean - first_half_mean) / abs(first_half_mean)) * 100

        direction = "up" if change_pct > 5 else "down" if change_pct < -5 else "stable"
        trends.append({
            "column": col,
            "direction": direction,
            "change_percent": round(change_pct, 1),
            "first_half_avg": round(first_half_mean, 2),
            "second_half_avg": round(second_half_mean, 2),
        })

    return trends


def generate_summary(df: pl.DataFrame, business_type: str, kpis: list[dict], trends: list[dict]) -> str:
    """Build a human-readable summary of the analysis."""
    lines = [
        f"Dataset contains {len(df)} records across {len(df.columns)} columns.",
        f"Detected business domain: {business_type}.",
    ]

    currency_kpis = [k for k in kpis if k["type"] == "currency"]
    if currency_kpis:
        lines.append(f"Key financial metric: {currency_kpis[0]['name']} = {currency_kpis[0]['value']:,.2f}")

    up_trends = [t for t in trends if t["direction"] == "up"]
    down_trends = [t for t in trends if t["direction"] == "down"]

    if up_trends:
        names = ", ".join(t["column"] for t in up_trends)
        lines.append(f"Upward trends detected in: {names}.")
    if down_trends:
        names = ", ".join(t["column"] for t in down_trends)
        lines.append(f"Downward trends detected in: {names}.")

    return " ".join(lines)
