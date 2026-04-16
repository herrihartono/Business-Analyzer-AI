from __future__ import annotations

import polars as pl


class DataCleaningReport:
    def __init__(self):
        self.corrections: list[dict] = []

    def log(self, column: str, action: str, count: int):
        if count > 0:
            self.corrections.append({"column": column, "action": action, "affected_rows": count})

    def to_list(self) -> list[dict]:
        return self.corrections


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
        if df[col].dtype == pl.Utf8:
            non_null = df[col].drop_nulls()
            if len(non_null) == 0:
                continue
            sample = non_null.head(50)
            numeric_count = 0
            for val in sample:
                try:
                    cleaned = str(val).replace(",", "").replace("$", "").replace("%", "").strip()
                    if cleaned:
                        float(cleaned)
                        numeric_count += 1
                except (ValueError, TypeError):
                    pass

            if numeric_count > len(sample) * 0.7:
                try:
                    cleaned_col = (
                        df[col]
                        .str.replace_all(r"[$,%]", "")
                        .str.replace_all(",", "")
                        .str.strip_chars()
                        .cast(pl.Float64, strict=False)
                    )
                    converted_count = cleaned_col.is_not_null().sum() - df[col].is_not_null().sum()
                    df = df.with_columns(cleaned_col.alias(col))
                    report.log(col, "converted_to_numeric", max(0, converted_count))
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
        elif df[col].dtype == pl.Utf8:
            df = df.with_columns(pl.col(col).fill_null("(empty)").alias(col))
            report.log(col, "filled_text_nulls", null_count)

    return df


def _remove_duplicate_rows(df: pl.DataFrame, report: DataCleaningReport) -> pl.DataFrame:
    original_len = len(df)
    df = df.unique()
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
        series = df[col].drop_nulls().cast(pl.Float64)
        if len(series) < 10:
            continue

        mean = series.mean()
        std = series.std()
        if std is None or std == 0 or mean is None:
            continue

        anomaly_count = ((series - mean).abs() / std > 3).sum()
        report.log(col, "anomalies_detected", anomaly_count)

    return df
