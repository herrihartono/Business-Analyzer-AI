import uuid
from datetime import datetime

from sqlalchemy import String, DateTime, Text, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class AnalysisResult(Base):
    __tablename__ = "analyses"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    upload_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("uploads.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    business_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    insights: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    recommendations: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    kpis: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    charts: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    data_corrections: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    raw_data_preview: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    column_stats: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    upload = relationship("Upload", back_populates="analyses")
