from typing import Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.models.analysis import AnalysisResult
from app.repositories.base import BaseRepository

class AnalysisRepository(BaseRepository[AnalysisResult]):
    def __init__(self):
        super().__init__(AnalysisResult)

    async def get(self, db: AsyncSession, id: Any) -> AnalysisResult | None:
        result = await db.execute(
            select(self.model).options(selectinload(self.model.upload)).filter(self.model.id == id)
        )
        return result.scalar_one_or_none()

    async def get_recent_analyses(self, db: AsyncSession, limit: int = 50) -> list[AnalysisResult]:
        result = await db.execute(
            select(self.model).options(selectinload(self.model.upload)).order_by(self.model.created_at.desc()).limit(limit)
        )
        return list(result.scalars().all())

analysis_repo = AnalysisRepository()
