import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.upload import Upload
from app.models.analysis import AnalysisResult
from app.models.schemas import AnalyzeRequest, AnalysisResponse
from app.services.file_parser import parse_file, dataframe_preview, column_statistics
from app.services.data_cleaner import clean_dataframe
from app.services.ai_engine import ai_detect_business_type, ai_calculate_kpis, ai_full_analysis
from app.services.chart_generator import generate_charts
from app.services.redis_cache import (
    get_cached_analysis,
    set_cached_analysis,
    invalidate_dashboard,
)

router = APIRouter(tags=["analysis"])


@router.post("/analyze", response_model=AnalysisResponse)
async def create_analysis(
    req: AnalyzeRequest,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Upload).where(Upload.id == req.upload_id))
    upload = result.scalar_one_or_none()
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found")

    cached = await get_cached_analysis(req.upload_id)
    if cached:
        existing = await db.execute(
            select(AnalysisResult).where(AnalysisResult.id == cached.get("id"))
        )
        existing_row = existing.scalar_one_or_none()
        if existing_row:
            return existing_row

    analysis = AnalysisResult(
        id=str(uuid.uuid4()),
        upload_id=upload.id,
        status="processing",
    )
    db.add(analysis)
    await db.flush()

    try:
        df = parse_file(upload.filename)
        df, cleaning_report = clean_dataframe(df)

        business_type = ai_detect_business_type(df)
        kpis = ai_calculate_kpis(df, business_type)
        ai_result = ai_full_analysis(df, business_type, kpis)

        summary = ai_result.get("summary", f"{business_type} analysis completed.")
        insights = ai_result.get("insights", [])
        recommendations = ai_result.get("recommendations", [])

        charts = generate_charts(df, business_type)
        preview = dataframe_preview(df)
        stats = column_statistics(df)

        analysis.business_type = business_type
        analysis.summary = summary
        analysis.insights = insights
        analysis.recommendations = recommendations
        analysis.kpis = kpis
        analysis.charts = charts
        analysis.data_corrections = cleaning_report.to_list()
        analysis.raw_data_preview = preview
        analysis.column_stats = stats
        analysis.status = "completed"
        analysis.completed_at = datetime.now(timezone.utc)

        upload.status = "analyzed"

        await set_cached_analysis(upload.id, {"id": analysis.id})
        await invalidate_dashboard()

    except Exception as e:
        analysis.status = "failed"
        analysis.summary = f"Analysis failed: {str(e)}"
        import traceback
        traceback.print_exc()

    return analysis


@router.get("/analysis/{analysis_id}", response_model=AnalysisResponse)
async def get_analysis(
    analysis_id: str,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(AnalysisResult).where(AnalysisResult.id == analysis_id))
    analysis = result.scalar_one_or_none()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return analysis


@router.get("/analyses", response_model=list[AnalysisResponse])
async def list_analyses(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(AnalysisResult).order_by(AnalysisResult.created_at.desc()).limit(50)
    )
    return result.scalars().all()
