from __future__ import annotations

from datetime import datetime, timezone

from celery import Celery

from app.config import get_settings

settings = get_settings()

celery_app = Celery(
    "smartbiz",
    broker=settings.redis_url,
    backend=settings.redis_url,
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
)


@celery_app.task(name="run_analysis")
def run_analysis_task(upload_id: str, stored_filename: str) -> dict:
    """Execute the full analysis pipeline as a background task."""
    from app.services.file_parser import parse_file, dataframe_preview, column_statistics
    from app.services.data_cleaner import clean_dataframe
    from app.services.analyzer import detect_business_type, calculate_kpis, detect_trends, generate_summary
    from app.services.ai_engine import generate_insights, generate_recommendations
    from app.services.chart_generator import generate_charts

    df = parse_file(stored_filename)

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

    return {
        "upload_id": upload_id,
        "business_type": business_type,
        "summary": summary,
        "insights": insights,
        "recommendations": recommendations,
        "kpis": kpis,
        "charts": charts,
        "data_corrections": cleaning_report.to_list(),
        "raw_data_preview": preview,
        "column_stats": stats,
        "completed_at": datetime.now(timezone.utc).isoformat(),
    }
