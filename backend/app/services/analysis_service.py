import uuid
import traceback
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.analysis import AnalysisResult
from app.repositories.analysis import analysis_repo
from app.repositories.upload import upload_repo
from app.services.file_parser import parse_file, dataframe_preview, column_statistics
from app.services.data_cleaner import clean_dataframe
from app.services.ai_engine import ai_detect_business_type, ai_calculate_kpis, ai_full_analysis
from app.services.chart_generator import generate_charts
from app.services.redis_cache import get_cached_analysis, set_cached_analysis, invalidate_dashboard

class AnalysisService:
    async def perform_analysis(self, db: AsyncSession, upload_id: str) -> AnalysisResult:
        upload = await upload_repo.get(db, id=upload_id)
        if not upload:
            raise ValueError("Upload not found")

        cached = await get_cached_analysis(upload_id)
        if cached:
            existing = await analysis_repo.get(db, id=cached.get("id"))
            if existing:
                return existing

        analysis_id = str(uuid.uuid4())
        analysis = await analysis_repo.create(db, obj_in={
            "id": analysis_id,
            "upload_id": upload.id,
            "status": "processing",
        })

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

            analysis = await analysis_repo.update(db, db_obj=analysis, obj_in={
                "business_type": business_type,
                "summary": summary,
                "insights": insights,
                "recommendations": recommendations,
                "kpis": kpis,
                "charts": charts,
                "data_corrections": cleaning_report.to_list(),
                "raw_data_preview": preview,
                "column_stats": stats,
                "status": "completed",
                "completed_at": datetime.now(timezone.utc)
            })

            await upload_repo.update(db, db_obj=upload, obj_in={"status": "analyzed"})
            
            await set_cached_analysis(upload.id, {"id": analysis.id})
            await invalidate_dashboard()

        except Exception as e:
            analysis = await analysis_repo.update(db, db_obj=analysis, obj_in={
                "status": "failed",
                "summary": f"Analysis failed: {str(e)}"
            })
            traceback.print_exc()

        return analysis

    async def get_analysis_by_id(self, db: AsyncSession, analysis_id: str) -> AnalysisResult | None:
        return await analysis_repo.get(db, id=analysis_id)

    async def get_recent_analyses(self, db: AsyncSession, limit: int = 50) -> list[AnalysisResult]:
        return await analysis_repo.get_recent_analyses(db, limit=limit)

    async def filter_analysis_data(
        self, db: AsyncSession, analysis_id: str, start_date: str | None, end_date: str | None
    ) -> dict | AnalysisResult | None:
        analysis = await analysis_repo.get(db, id=analysis_id)
        if not analysis:
            return None

        if not start_date and not end_date:
            return analysis

        upload = await upload_repo.get(db, id=analysis.upload_id)
        if not upload:
            return analysis

        try:
            import polars as pl
            from app.services.ai_engine import _fallback_kpis
            
            df = parse_file(upload.filename)
            df, _ = clean_dataframe(df)

            date_cols = [c for c in df.columns if df[c].dtype in (pl.Date, pl.Datetime)]
            if not date_cols:
                return analysis
            
            date_col = date_cols[0]
            
            if start_date:
                try:
                    df = df.filter(pl.col(date_col) >= datetime.strptime(start_date, "%Y-%m-%d"))
                except ValueError:
                    pass
            if end_date:
                try:
                    df = df.filter(pl.col(date_col) <= datetime.strptime(end_date, "%Y-%m-%d"))
                except ValueError:
                    pass
            
            charts = generate_charts(df, analysis.business_type or "General")
            kpis = _fallback_kpis(df, analysis.business_type or "General")
            preview = dataframe_preview(df)
            
            result_dict = {
                "id": analysis.id,
                "upload_id": analysis.upload_id,
                "status": analysis.status,
                "business_type": analysis.business_type,
                "summary": analysis.summary,
                "insights": analysis.insights,
                "recommendations": analysis.recommendations,
                "kpis": kpis,
                "charts": charts,
                "data_corrections": analysis.data_corrections,
                "raw_data_preview": preview,
                "column_stats": analysis.column_stats,
                "created_at": analysis.created_at,
                "completed_at": analysis.completed_at,
            }
            return result_dict
            
        except Exception as e:
            traceback.print_exc()
            return analysis

analysis_service = AnalysisService()
