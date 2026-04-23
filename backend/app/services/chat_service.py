import json
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.analysis import AnalysisResult
from app.repositories.analysis import analysis_repo
from app.repositories.upload import upload_repo
from app.services.ai_engine import has_groq, generate_chat_response
from app.services.redis_cache import get_cached_chat, set_cached_chat

class ChatService:
    async def get_chat_response(
        self,
        db: AsyncSession,
        question: str,
        analysis_id: str | None = None,
        upload_id: str | None = None,
    ) -> dict:
        analysis = await self._resolve_analysis_context(
            db,
            analysis_id=analysis_id,
            upload_id=upload_id,
        )
        if analysis.status != "completed":
            raise ValueError("Analysis not yet completed")

        cached_answer = await get_cached_chat(analysis.id, question)
        if cached_answer:
            return {"answer": cached_answer, "sources": ["analysis_data", "cache"]}

        context = self._build_chat_context(analysis)

        if has_groq():
            answer = generate_chat_response(question, context, analysis.business_type)
        else:
            answer = self._rule_based_answer(question, analysis)

        await set_cached_chat(analysis.id, question, answer)

        return {"answer": answer, "sources": ["analysis_data"]}

    async def _resolve_analysis_context(
        self,
        db: AsyncSession,
        analysis_id: str | None = None,
        upload_id: str | None = None,
    ) -> AnalysisResult:
        if analysis_id:
            analysis = await analysis_repo.get(db, id=analysis_id)
            if not analysis:
                raise ValueError("Analysis not found")
            return analysis

        if not upload_id:
            raise ValueError("Analysis context is required")

        upload = await upload_repo.get(db, id=upload_id)
        if not upload:
            raise ValueError("Upload not found")

        analyses = await analysis_repo.get_recent_analyses(db, limit=1, upload_id=upload_id)
        if not analyses:
            raise ValueError("No analysis found for selected upload")

        return analyses[0]

    def _build_chat_context(self, analysis: AnalysisResult) -> str:
        parts = [
            f"Business Type: {analysis.business_type}",
            f"Summary: {analysis.summary}",
        ]

        if analysis.kpis:
            parts.append("\nKPIs:")
            for kpi in analysis.kpis:
                parts.append(f"  - {kpi.get('name', '')}: {kpi.get('value', '')}")

        if analysis.insights:
            parts.append("\nInsights:")
            for ins in analysis.insights:
                parts.append(f"  - {ins.get('title', '')}: {ins.get('description', '')}")

        if analysis.recommendations:
            parts.append("\nRecommendations:")
            for rec in analysis.recommendations:
                parts.append(f"  - [{rec.get('priority', '')}] {rec.get('title', '')}: {rec.get('description', '')}")

        if analysis.column_stats:
            parts.append("\nColumn Statistics:")
            parts.append(json.dumps(analysis.column_stats, indent=2, default=str)[:3000])

        if analysis.raw_data_preview:
            parts.append("\nSample Data (first 10 rows):")
            for row in analysis.raw_data_preview[:10]:
                parts.append(f"  {json.dumps(row, default=str, ensure_ascii=False)}")

        return "\n".join(parts)

    def _rule_based_answer(self, question: str, analysis: AnalysisResult) -> str:
        q = question.lower()

        if any(kw in q for kw in ["summary", "overview", "tell me", "ringkasan", "apa ini"]):
            return analysis.summary or "No summary available."

        if any(kw in q for kw in ["kpi", "metric", "number", "total", "value", "angka", "nilai"]):
            if analysis.kpis:
                lines = ["Here are the key metrics:"]
                for kpi in analysis.kpis:
                    lines.append(f"  - {kpi.get('name', '')}: {kpi.get('value', '')}")
                return "\n".join(lines)
            return "No KPI data available."

        if any(kw in q for kw in ["insight", "finding", "temuan", "analisa"]):
            if analysis.insights:
                lines = ["Key insights:"]
                for ins in analysis.insights:
                    lines.append(f"  - {ins.get('title', '')}: {ins.get('description', '')}")
                return "\n".join(lines)
            return "No insights available."

        if any(kw in q for kw in ["recommend", "suggest", "should", "action", "saran", "rekomendasi"]):
            if analysis.recommendations:
                lines = ["Recommendations:"]
                for rec in analysis.recommendations:
                    lines.append(f"  - [{rec.get('priority', '')}] {rec.get('title', '')}: {rec.get('description', '')}")
                return "\n".join(lines)
            return "No recommendations available."

        return (
            f"Analysis: {analysis.summary or 'Completed.'}\n\n"
            "Try asking about: KPIs, insights, recommendations, or a summary."
        )

chat_service = ChatService()
