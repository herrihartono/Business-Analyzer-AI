from __future__ import annotations

import logging
import uuid
import traceback
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session
from app.models.analysis import AnalysisResult
from app.repositories.analysis import analysis_repo
from app.repositories.upload import upload_repo
from app.services.file_parser import parse_file, dataframe_preview, column_statistics
from app.services.data_cleaner import clean_dataframe
from app.services.ai_engine import ai_unified_analysis, _fallback_kpis
from app.services.chart_generator import generate_charts
from app.services.redis_cache import get_cached_analysis, set_cached_analysis, invalidate_dashboard

logger = logging.getLogger(__name__)


class AnalysisService:
    async def create_analysis_record(self, db: AsyncSession, upload_id: str) -> tuple[AnalysisResult, bool]:
        """
        Create a new analysis record with status 'processing' or return existing completed one.
        Returns (analysis_record, is_already_done).
        """
        upload = await upload_repo.get(db, id=upload_id)
        if not upload:
            raise ValueError("Upload not found")

        cached = await get_cached_analysis(upload_id)
        if cached:
            existing = await analysis_repo.get(db, id=cached.get("id"))
            if existing and existing.status == "completed":
                return existing, True

        analysis_id = str(uuid.uuid4())
        analysis = await analysis_repo.create(db, obj_in={
            "id": analysis_id,
            "upload_id": upload.id,
            "status": "processing",
        })
        await db.commit()
        return analysis, False

    async def run_pipeline(self, analysis_id: str, upload_id: str) -> None:
        """
        Execute the end-to-end data analysis pipeline asynchronously.
        Designed to run safely inside FastAPI BackgroundTasks with its own session.
        """
        async with async_session() as session:
            try:
                analysis = await analysis_repo.get(session, id=analysis_id)
                upload = await upload_repo.get(session, id=upload_id)
                if not analysis or not upload:
                    return

                # 1. Parse file safely into Polars DataFrame
                df = parse_file(upload.filename)

                # 2. Data cleaning & anomaly detection
                df, cleaning_report = clean_dataframe(df)

                # 3. Polars fast math + Single-turn AI analysis
                ai_result = await ai_unified_analysis(df)

                business_type = ai_result.get("business_type", "General Business")
                summary = ai_result.get("summary", f"Analisis {business_type} selesai.")
                insights = ai_result.get("insights", [])
                recommendations = ai_result.get("recommendations", [])
                kpis = ai_result.get("kpis", [])

                # 4. Generate Recharts configurations and statistics
                charts = generate_charts(df, business_type)
                preview = dataframe_preview(df)
                stats = column_statistics(df)

                # 5. Persist completed analysis
                await analysis_repo.update(session, db_obj=analysis, obj_in={
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
                    "completed_at": datetime.now(timezone.utc),
                })

                await upload_repo.update(session, db_obj=upload, obj_in={"status": "analyzed"})
                await session.commit()

                # 6. Update cache and invalidate dashboard stats
                await set_cached_analysis(upload.id, {"id": analysis.id})
                await invalidate_dashboard()

            except Exception as e:
                logger.error("Analysis background pipeline error: %s", e, exc_info=True)
                try:
                    analysis = await analysis_repo.get(session, id=analysis_id)
                    if analysis:
                        await analysis_repo.update(session, db_obj=analysis, obj_in={
                            "status": "failed",
                            "summary": f"Analisis gagal: {str(e)}",
                        })
                        await session.commit()
                except Exception:
                    pass

    async def perform_analysis(self, db: AsyncSession, upload_id: str) -> AnalysisResult:
        """Synchronously execute analysis or return existing."""
        analysis, is_done = await self.create_analysis_record(db, upload_id)
        if is_done:
            return analysis

        await self.run_pipeline(analysis.id, upload_id)
        refreshed = await analysis_repo.get(db, id=analysis.id)
        return refreshed or analysis

    async def get_analysis_by_id(self, db: AsyncSession, analysis_id: str) -> AnalysisResult | None:
        return await analysis_repo.get(db, id=analysis_id)

    async def get_recent_analyses(
        self,
        db: AsyncSession,
        limit: int = 50,
        upload_id: str | None = None,
    ) -> list[AnalysisResult]:
        return await analysis_repo.get_recent_analyses(db, limit=limit, upload_id=upload_id)

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
            df = parse_file(upload.filename)
            df, _ = clean_dataframe(df)

            date_cols = [c for c in df.columns if df[c].dtype in (pl.Date, pl.Datetime)]
            if not date_cols:
                return analysis

            date_col = date_cols[0]
            is_date_type = df[date_col].dtype == pl.Date

            if start_date:
                try:
                    parsed_dt = datetime.strptime(start_date, "%Y-%m-%d")
                    target = parsed_dt.date() if is_date_type else parsed_dt
                    df = df.filter(pl.col(date_col) >= target)
                except ValueError:
                    pass
            if end_date:
                try:
                    parsed_dt = datetime.strptime(end_date, "%Y-%m-%d")
                    target = parsed_dt.date() if is_date_type else parsed_dt
                    df = df.filter(pl.col(date_col) <= target)
                except ValueError:
                    pass

            business_type = analysis.business_type or "General"
            charts = generate_charts(df, business_type)
            kpis = _fallback_kpis(df, business_type)
            preview = dataframe_preview(df)

            return {
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

        except Exception as e:
            logger.error("Filter analysis error: %s", e, exc_info=True)
            return analysis


analysis_service = AnalysisService()
