from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.analysis import AnalysisResult
from app.repositories.base import BaseRepository

class AnalysisRepository(BaseRepository[AnalysisResult]):
    def __init__(self):
        super().__init__(AnalysisResult)

    async def get_recent_analyses(self, db: AsyncSession, limit: int = 50) -> list[AnalysisResult]:
        result = await db.execute(
            select(self.model).order_by(self.model.created_at.desc()).limit(limit)
        )
        return list(result.scalars().all())

analysis_repo = AnalysisRepository()
