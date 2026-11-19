import logging
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.schemas import AnalyzeRequest, AnalysisResponse, FilterRequest
from app.services.analysis_service import analysis_service

logger = logging.getLogger(__name__)
router = APIRouter(tags=["analysis"])


@router.post("/analyze", response_model=AnalysisResponse)
async def create_analysis(
    req: AnalyzeRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    try:
        analysis, is_done = await analysis_service.create_analysis_record(db, req.upload_id)
        if not is_done:
            # Dispatch analysis pipeline to background worker
            background_tasks.add_task(analysis_service.run_pipeline, analysis.id, req.upload_id)
        return analysis
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error("Error creating analysis for upload %s: %s", req.upload_id, e, exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/analysis/{analysis_id}", response_model=AnalysisResponse)
async def get_analysis(
    analysis_id: str,
    db: AsyncSession = Depends(get_db),
):
    analysis = await analysis_service.get_analysis_by_id(db, analysis_id)
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return analysis


@router.get("/analyses", response_model=list[AnalysisResponse])
async def list_analyses(
    upload_id: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    return await analysis_service.get_recent_analyses(db, upload_id=upload_id)


@router.post("/analysis/{analysis_id}/filter", response_model=AnalysisResponse)
async def filter_analysis(
    analysis_id: str,
    req: FilterRequest,
    db: AsyncSession = Depends(get_db),
):
    analysis = await analysis_service.filter_analysis_data(db, analysis_id, req.start_date, req.end_date)
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return analysis
