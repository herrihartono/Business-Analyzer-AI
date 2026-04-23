from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.schemas import AnalyzeRequest, AnalysisResponse
from app.services.analysis_service import analysis_service

router = APIRouter(tags=["analysis"])


@router.post("/analyze", response_model=AnalysisResponse)
async def create_analysis(
    req: AnalyzeRequest,
    db: AsyncSession = Depends(get_db),
):
    try:
        analysis = await analysis_service.perform_analysis(db, req.upload_id)
        return analysis
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
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


from app.models.schemas import FilterRequest

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

