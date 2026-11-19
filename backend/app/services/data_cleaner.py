from __future__ import annotations

import re
from typing import Any
import polars as pl


class DataCleaningReport:
    def __init__(self):
        self.corrections: list[dict] = []

    def log(self, column: str, action: str, count: int):
        if count > 0:
            self.corrections.append({"column": column, "action": action, "affected_rows": count})

    def to_list(self) -> list[dict]:
        return self.corrections


def _clean_numeric_string(val: Any) -> float | None:
    """Parse string numbers with support for international & Indonesian (IDR) formats."""
    if val is None:
        return None
    s = str(val).strip()
    if not s:
        return None

    is_negative = False
    if s.startswith("(") and s.endswith(")"):
        is_negative = True
        s = s[1:-1].strip()

    # Strip currency words, symbols, percentage, and whitespace
    s = re.sub(r"(?i)\b(rp|idr|usd|eur|sgd)\b|[$\u20ac\u00a3%\s]", "", s).strip()
    if not s:
        return None

    if "." in s and "," in s:
        if s.rfind(",") > s.rfind("."):
            # Indonesian/European format: e.g. 1.500.000,50
            s = s.replace(".", "").replace(",", ".")
        else:
            # US format: e.g. 1,500,000.50
            s = s.replace(",", "")
    elif "." in s and "," not in s:
        if s.count(".") > 1:
            # Indonesian thousands: 1.500.000
            s = s.replace(".", "")
        elif re.match(r"^\d{1,3}\.\d{3}$", s):
            # 3-digit thousand grouping: 150.000
            s = s.replace(".", "")
    elif "," in s and "." not in s:
        if s.count(",") > 1:
            s = s.replace(",", "")
        elif re.match(r"^\d{1,3},\d{3}$", s):
            s = s.replace(",", "")
        else:
            # Decimal comma: 150,5
            s = s.replace(",", ".")

    try:
        n = float(s)
        return -n if is_negative else n
    except (ValueError, TypeError):
        return None


def clean_dataframe(df: pl.DataFrame) -> tuple[pl.DataFrame, DataCleaningReport]:
    """Clean a DataFrame: fix types, fill missing values, flag anomalies."""
    report = DataCleaningReport()

    df = _attempt_numeric_conversion(df, report)
    df = _fill_missing_values(df, report)
    df = _remove_duplicate_rows(df, report)
    df = _flag_anomalies(df, report)

    return df, report


def _attempt_numeric_conversion(df: pl.DataFrame, report: DataCleaningReport) -> pl.DataFrame:
    """Try converting string columns that look numeric."""
    for col in df.columns:
        if df[col].dtype in (pl.Utf8, pl.String):
            non_null = df[col].drop_nulls()
            if len(non_null) == 0:
                continue

            sample = non_null.head(50).to_list()
            numeric_sample_count = 0
            for val in sample:
                if _clean_numeric_string(val) is not None:
                    numeric_sample_count += 1

            if numeric_sample_count > len(sample) * 0.6:
                try:
                    cleaned_col = df[col].map_elements(_clean_numeric_string, return_dtype=pl.Float64)
                    converted_count = int(cleaned_col.drop_nulls().len())
                    if converted_count > 0:
                        df = df.with_columns(cleaned_col.alias(col))
                        report.log(col, "converted_to_numeric", converted_count)
                except Exception:
                    pass
    return df


def _fill_missing_values(df: pl.DataFrame, report: DataCleaningReport) -> pl.DataFrame:
    """Fill nulls: numeric columns get forward-fill then 0, strings get '(empty)'."""
    for col in df.columns:
        null_count = df[col].null_count()
        if null_count == 0:
            continue

        if df[col].dtype in (pl.Float64, pl.Float32, pl.Int64, pl.Int32, pl.Int16, pl.Int8):
            df = df.with_columns(pl.col(col).forward_fill().fill_null(0).alias(col))
            report.log(col, "filled_numeric_nulls", null_count)
        elif df[col].dtype in (pl.Utf8, pl.String):
            df = df.with_columns(pl.col(col).fill_null("(empty)").alias(col))
            report.log(col, "filled_text_nulls", null_count)

    return df


def _remove_duplicate_rows(df: pl.DataFrame, report: DataCleaningReport) -> pl.DataFrame:
    original_len = len(df)
    df = df.unique(maintain_order=True)
    removed = original_len - len(df)
    if removed > 0:
        report.log("*", "removed_duplicates", removed)
    return df


def _flag_anomalies(df: pl.DataFrame, report: DataCleaningReport) -> pl.DataFrame:
    """Flag numeric outliers using z-score > 3."""
    numeric_cols = [
        c for c in df.columns
        if df[c].dtype in (pl.Float64, pl.Float32, pl.Int64, pl.Int32)
    ]

    for col in numeric_cols:
        series = df[col].drop_nulls().drop_nans().cast(pl.Float64)
        if len(series) < 10:
            continue

        mean = series.mean()
        std = series.std()
        if std is None or std == 0 or mean is None:
            continue

        anomaly_count = int(((series - mean).abs() / std > 3).sum())
        report.log(col, "anomalies_detected", anomaly_count)

    return df
