import uuid
import json
from datetime import datetime

from sqlalchemy import String, DateTime, Text, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import TypeDecorator

from app.database import Base


class JSONType(TypeDecorator):
    """SQLite-compatible JSON column type."""
    impl = Text
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is not None:
            return json.dumps(value, default=str)
        return None

    def process_result_value(self, value, dialect):
        if value is not None:
            return json.loads(value)
        return None


class AnalysisResult(Base):
    __tablename__ = "analyses"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    upload_id: Mapped[str] = mapped_column(String(36), ForeignKey("uploads.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    business_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    insights: Mapped[dict | None] = mapped_column(JSONType, nullable=True)
    recommendations: Mapped[dict | None] = mapped_column(JSONType, nullable=True)
    kpis: Mapped[dict | None] = mapped_column(JSONType, nullable=True)
    charts: Mapped[dict | None] = mapped_column(JSONType, nullable=True)
    data_corrections: Mapped[dict | None] = mapped_column(JSONType, nullable=True)
    raw_data_preview: Mapped[dict | None] = mapped_column(JSONType, nullable=True)
    column_stats: Mapped[dict | None] = mapped_column(JSONType, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    upload = relationship("Upload", back_populates="analyses")
