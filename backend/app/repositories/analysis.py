from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.analysis import AnalysisResult
from app.repositories.base import BaseRepository

class AnalysisRepository(BaseRepository[AnalysisResult]):
    def __init__(self):
        super().__init__(AnalysisResult)

    async def get_recent_analyses(
        self,
        db: AsyncSession,
        limit: int = 50,
        upload_id: str | None = None,
    ) -> list[AnalysisResult]:
        query = select(self.model)
        if upload_id:
            query = query.where(self.model.upload_id == upload_id)

        result = await db.execute(query.order_by(self.model.created_at.desc()).limit(limit))
        return list(result.scalars().all())

analysis_repo = AnalysisRepository()
