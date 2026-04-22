from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel


class UploadResponse(BaseModel):
    id: str
    filename: str
    original_name: str
    file_type: str
    file_size: int
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class AnalysisResponse(BaseModel):
    id: str
    upload_id: str
    status: str
    business_type: str | None = None
    summary: str | None = None
    insights: list[dict[str, Any]] | None = None
    recommendations: list[dict[str, Any]] | None = None
    kpis: list[dict[str, Any]] | None = None
    charts: list[dict[str, Any]] | None = None
    data_corrections: list[dict[str, Any]] | None = None
    raw_data_preview: list[dict[str, Any]] | None = None
    column_stats: dict[str, Any] | None = None
    created_at: datetime
    completed_at: datetime | None = None

    model_config = {"from_attributes": True}


class AnalyzeRequest(BaseModel):
    upload_id: str


class FilterRequest(BaseModel):
    start_date: str | None = None
    end_date: str | None = None


class ChatRequest(BaseModel):
    analysis_id: str
    question: str


class ChatResponse(BaseModel):
    answer: str
    sources: list[str] | None = None


class DashboardResponse(BaseModel):
    total_uploads: int
    total_analyses: int
    recent_analyses: list[AnalysisResponse]
    business_type_counts: dict[str, int]
