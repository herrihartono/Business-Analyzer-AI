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
from app.services.analyzer import detect_business_type, calculate_kpis, detect_trends, generate_summary
from app.services.ai_engine import generate_insights, generate_recommendations
from app.services.chart_generator import generate_charts

router = APIRouter(tags=["analysis"])


@router.post("/analyze", response_model=AnalysisResponse)
async def create_analysis(
    req: AnalyzeRequest,
    db: AsyncSession = Depends(get_db),
):
    upload = await db.get(Upload, req.upload_id)
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found")

    analysis = AnalysisResult(
        id=uuid.uuid4(),
        upload_id=upload.id,
        status="processing",
    )
    db.add(analysis)
    await db.flush()

    try:
        df = parse_file(upload.filename)
        df, cleaning_report = clean_dataframe(df)

        business_type = detect_business_type(df)
        kpis = calculate_kpis(df, business_type)
        trends = detect_trends(df)
        summary = generate_summary(df, business_type, kpis, trends)

        insights = generate_insights(df, business_type, kpis, trends)
        recommendations = generate_recommendations(df, business_type, kpis, insights)
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

    except Exception as e:
        analysis.status = "failed"
        analysis.summary = str(e)

    return analysis


@router.get("/analysis/{analysis_id}", response_model=AnalysisResponse)
async def get_analysis(
    analysis_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    analysis = await db.get(AnalysisResult, analysis_id)
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return analysis


@router.get("/analyses", response_model=list[AnalysisResponse])
async def list_analyses(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(AnalysisResult).order_by(AnalysisResult.created_at.desc()).limit(50)
    )
    return result.scalars().all()
