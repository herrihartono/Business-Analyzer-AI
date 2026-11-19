from __future__ import annotations

import math
from typing import Any
import polars as pl


def generate_charts(df: pl.DataFrame, business_type: str) -> list[dict]:
    """Auto-generate Recharts-compatible chart configurations from data."""
    charts: list[dict] = []

    numeric_cols = [
        c for c in df.columns
        if df[c].dtype in (pl.Float64, pl.Float32, pl.Int64, pl.Int32)
    ]
    text_cols = [c for c in df.columns if df[c].dtype in (pl.Utf8, pl.String)]
    date_cols = [c for c in df.columns if df[c].dtype in (pl.Date, pl.Datetime)]

    if date_cols and numeric_cols:
        time_chart = _time_series_chart(df, date_cols[0], numeric_cols[:3])
        if time_chart:
            charts.append(time_chart)

    if numeric_cols and len(numeric_cols) >= 2:
        charts.append(_bar_chart(df, numeric_cols[:5]))

    if text_cols and numeric_cols:
        charts.append(_category_pie_chart(df, text_cols[0], numeric_cols[0]))

    if numeric_cols:
        charts.append(_distribution_bar(df, numeric_cols[0]))

    if not charts and numeric_cols:
        charts.append(_simple_value_chart(df, numeric_cols[:4]))

    return charts[:6]


def _time_series_chart(df: pl.DataFrame, date_col: str, value_cols: list[str]) -> dict | None:
    try:
        # Group by date and sum numeric columns to avoid fragmented scatter
        agg_df = (
            df.group_by(date_col)
            .agg([pl.col(c).sum().alias(c) for c in value_cols])
            .sort(date_col)
        )
    except Exception:
        agg_df = df.sort(date_col)

    if len(agg_df) == 0:
        return None

    max_points = 50
    step = max(1, len(agg_df) // max_points)
    sampled = agg_df.gather_every(step)

    data = []
    for row in sampled.to_dicts():
        point: dict[str, Any] = {"date": str(row[date_col])}
        for vc in value_cols:
            val = row.get(vc)
            point[vc] = round(float(val), 2) if val is not None and not math.isnan(float(val)) else 0
        data.append(point)

    return {
        "type": "line",
        "title": f"Tren Waktu Berdasarkan {date_col}",
        "xKey": "date",
        "dataKeys": value_cols,
        "data": data,
    }


def _bar_chart(df: pl.DataFrame, numeric_cols: list[str]) -> dict:
    """Create a bar chart summarizing numeric column totals."""
    data = []
    for col in numeric_cols:
        series = df[col].drop_nulls().drop_nans().cast(pl.Float64)
        if len(series) == 0:
            continue
        total_val = float(series.sum())
        mean_val = float(series.mean())
        data.append({
            "name": col,
            "total": round(total_val, 2) if not math.isnan(total_val) else 0.0,
            "average": round(mean_val, 2) if not math.isnan(mean_val) else 0.0,
        })

    return {
        "type": "bar",
        "title": "Ringkasan Kolom Numerik",
        "xKey": "name",
        "dataKeys": ["total", "average"],
        "data": data,
    }


def _category_pie_chart(df: pl.DataFrame, text_col: str, numeric_col: str) -> dict:
    """Pie chart showing breakdown of a text column by a numeric column."""
    try:
        grouped = (
            df.group_by(text_col)
            .agg(pl.col(numeric_col).sum().alias("value"))
            .sort("value", descending=True)
            .head(8)
        )
        data = [
            {
                "name": str(row[text_col]),
                "value": round(float(row["value"]), 2) if row["value"] is not None and not math.isnan(float(row["value"])) else 0.0,
            }
            for row in grouped.to_dicts()
        ]
    except Exception:
        data = []

    return {
        "type": "pie",
        "title": f"Distribusi {numeric_col} per {text_col}",
        "dataKey": "value",
        "nameKey": "name",
        "data": data,
    }


def _distribution_bar(df: pl.DataFrame, col: str) -> dict:
    """Histogram-style bar chart showing value distribution safely."""
    series = df[col].drop_nulls().drop_nans().cast(pl.Float64)
    if len(series) < 2:
        return {"type": "bar", "title": f"Distribusi {col}", "data": [], "xKey": "range", "dataKeys": ["count"]}

    min_val = float(series.min())
    max_val = float(series.max())
    if math.isnan(min_val) or math.isnan(max_val):
        return {"type": "bar", "title": f"Distribusi {col}", "data": [], "xKey": "range", "dataKeys": ["count"]}

    n_bins = min(10, max(3, len(series) // 5))
    bin_width = (max_val - min_val) / n_bins if max_val != min_val else 1.0

    bins = [
        {"range": f"{min_val + i * bin_width:.0f} - {min_val + (i + 1) * bin_width:.0f}", "count": 0}
        for i in range(n_bins)
    ]

    for val in series.to_list():
        if val is None or math.isnan(val):
            continue
        idx = min(int((val - min_val) / bin_width), n_bins - 1) if bin_width > 0 else 0
        bins[idx]["count"] += 1

    return {
        "type": "bar",
        "title": f"Distribusi Frekuensi {col}",
        "xKey": "range",
        "dataKeys": ["count"],
        "data": bins,
    }


def _simple_value_chart(df: pl.DataFrame, numeric_cols: list[str]) -> dict:
    """Fallback chart: row-by-row values of first few numeric columns."""
    max_rows = 30
    step = max(1, len(df) // max_rows)
    sampled = df.gather_every(step).head(max_rows)

    data = []
    for i, row in enumerate(sampled.to_dicts()):
        point: dict[str, Any] = {"index": i + 1}
        for col in numeric_cols:
            val = row.get(col)
            point[col] = round(float(val), 2) if val is not None and not math.isnan(float(val)) else 0.0
        data.append(point)

    return {
        "type": "line",
        "title": "Ikhtisar Data",
        "xKey": "index",
        "dataKeys": numeric_cols,
        "data": data,
    }
