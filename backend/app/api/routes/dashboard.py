from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.upload import Upload
from app.models.analysis import AnalysisResult
from app.models.schemas import DashboardResponse, AnalysisResponse
from app.services.redis_cache import get_cached_dashboard, set_cached_dashboard

router = APIRouter(tags=["dashboard"])


@router.get("/dashboard", response_model=DashboardResponse)
async def get_dashboard(db: AsyncSession = Depends(get_db)):
    cached = await get_cached_dashboard()
    if cached:
        return DashboardResponse(**cached)

    upload_count = await db.scalar(select(func.count()).select_from(Upload))
    analysis_count = await db.scalar(select(func.count()).select_from(AnalysisResult))

    recent = await db.execute(
        select(AnalysisResult)
        .where(AnalysisResult.status == "completed")
        .order_by(AnalysisResult.created_at.desc())
        .limit(10)
    )
    recent_analyses = recent.scalars().all()

    type_rows = await db.execute(
        select(AnalysisResult.business_type, func.count())
        .where(AnalysisResult.business_type.is_not(None))
        .group_by(AnalysisResult.business_type)
    )
    type_counts = {row[0]: row[1] for row in type_rows.all()}

    dashboard_data = {
        "total_uploads": upload_count or 0,
        "total_analyses": analysis_count or 0,
        "recent_analyses": [
            {
                "id": a.id,
                "upload_id": a.upload_id,
                "business_type": a.business_type,
                "summary": a.summary,
                "status": a.status,
                "created_at": a.created_at,
                "completed_at": a.completed_at,
            }
            for a in recent_analyses
        ],
        "business_type_counts": type_counts,
    }
    await set_cached_dashboard(dashboard_data)

    return DashboardResponse(
        total_uploads=upload_count or 0,
        total_analyses=analysis_count or 0,
        recent_analyses=recent_analyses,
        business_type_counts=type_counts,
    )
