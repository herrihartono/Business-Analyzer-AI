from __future__ import annotations

import math
import os
from pathlib import Path

import polars as pl
import pdfplumber
from docx import Document

from app.config import get_settings

settings = get_settings()


def _deduplicate_headers(headers: list[str]) -> list[str]:
    """Ensure all column headers are unique and non-empty."""
    seen: dict[str, int] = {}
    unique: list[str] = []
    for i, h in enumerate(headers):
        name = str(h).strip() if h and str(h).strip() else f"col_{i}"
        if name in seen:
            seen[name] += 1
            unique.append(f"{name}_{seen[name]}")
        else:
            seen[name] = 0
            unique.append(name)
    return unique


def parse_file(stored_filename: str) -> pl.DataFrame:
    """Parse an uploaded file into a Polars DataFrame."""
    path = os.path.join(settings.upload_dir, stored_filename)
    ext = Path(stored_filename).suffix.lower()

    if ext == ".csv":
        return _parse_csv(path)
    elif ext in (".xlsx", ".xls"):
        return _parse_excel(path)
    elif ext == ".pdf":
        return _parse_pdf(path)
    elif ext in (".docx", ".doc"):
        return _parse_docx(path)
    else:
        raise ValueError(f"Unsupported file type: {ext}")


def _parse_csv(path: str) -> pl.DataFrame:
    """Parse CSV with delimiter and encoding fallback."""
    try:
        df = pl.read_csv(path, infer_schema_length=1000, try_parse_dates=True)
        # Check if entire row was parsed into a single column due to semicolon separator
        if len(df.columns) == 1 and ";" in df.columns[0]:
            return pl.read_csv(path, separator=";", infer_schema_length=1000, try_parse_dates=True)
        return df
    except Exception:
        # Fallback with alternate separator and encoding
        try:
            return pl.read_csv(path, separator=";", infer_schema_length=1000, try_parse_dates=True)
        except Exception:
            return pl.read_csv(path, encoding="iso-8859-1", infer_schema_length=1000, try_parse_dates=True)


def _parse_excel(path: str) -> pl.DataFrame:
    return pl.read_excel(path, infer_schema_length=1000)


def _parse_pdf(path: str) -> pl.DataFrame:
    """Extract tables from PDF. Falls back to extracting text as rows."""
    tables: list[list[list[str]]] = []
    max_pages = 50

    with pdfplumber.open(path) as pdf:
        pages = pdf.pages[:max_pages]
        for page in pages:
            page_tables = page.extract_tables()
            if page_tables:
                tables.extend(page_tables)

    if tables:
        merged = tables[0]
        for t in tables[1:]:
            merged.extend(t)
        if len(merged) < 2:
            return pl.DataFrame({"text": [str(row) for row in merged]})

        headers = _deduplicate_headers([h for h in merged[0]])
        data = {h: [] for h in headers}
        for row in merged[1:]:
            for i, h in enumerate(headers):
                data[h].append(str(row[i]).strip() if i < len(row) and row[i] is not None else None)
        return pl.DataFrame(data)

    with pdfplumber.open(path) as pdf:
        lines = []
        for page in pdf.pages[:max_pages]:
            text = page.extract_text()
            if text:
                lines.extend(text.split("\n"))
    return pl.DataFrame({"text": lines}) if lines else pl.DataFrame({"text": ["(empty document)"]})


def _parse_docx(path: str) -> pl.DataFrame:
    """Extract tables from DOCX. Falls back to paragraph text."""
    doc = Document(path)

    if doc.tables:
        table = doc.tables[0]
        raw_headers = [cell.text.strip() for cell in table.rows[0].cells]
        headers = _deduplicate_headers(raw_headers)
        data = {h: [] for h in headers}
        for row in table.rows[1:]:
            for i, h in enumerate(headers):
                data[h].append(row.cells[i].text.strip() if i < len(row.cells) and row.cells[i].text.strip() else None)
        return pl.DataFrame(data)

    paragraphs = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
    return (
        pl.DataFrame({"text": paragraphs})
        if paragraphs
        else pl.DataFrame({"text": ["(empty document)"]})
    )


def dataframe_preview(df: pl.DataFrame, n: int = 50) -> list[dict]:
    """Return first n rows as list of dicts for JSON serialization."""
    return df.head(n).to_dicts()


def column_statistics(df: pl.DataFrame) -> dict:
    """Compute basic statistics for each column safely."""
    stats: dict = {}
    for col in df.columns:
        dtype = str(df[col].dtype)
        info: dict = {
            "dtype": dtype,
            "null_count": int(df[col].null_count()),
            "unique_count": int(df[col].n_unique()),
        }

        if df[col].dtype in (pl.Float64, pl.Float32, pl.Int64, pl.Int32, pl.Int16, pl.Int8):
            desc = df[col].drop_nulls().drop_nans()
            if len(desc) > 0:
                mean_val = desc.mean()
                min_val = desc.min()
                max_val = desc.max()
                std_val = desc.std() if len(desc) > 1 else 0.0

                if mean_val is not None and not math.isnan(float(mean_val)):
                    info["mean"] = float(mean_val)
                if min_val is not None and not math.isnan(float(min_val)):
                    info["min"] = float(min_val)
                if max_val is not None and not math.isnan(float(max_val)):
                    info["max"] = float(max_val)
                if std_val is not None and not math.isnan(float(std_val)):
                    info["std"] = float(std_val)

        stats[col] = info
    return stats
