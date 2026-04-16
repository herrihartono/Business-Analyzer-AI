import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.models.analysis import AnalysisResult
from app.models.schemas import ChatRequest, ChatResponse
from app.services.ai_engine import _call_openai, _has_openai
from app.services.redis_cache import get_cached_chat, set_cached_chat

router = APIRouter(tags=["chat"])
settings = get_settings()


@router.post("/chat", response_model=ChatResponse)
async def chat_with_data(
    req: ChatRequest,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(AnalysisResult).where(AnalysisResult.id == req.analysis_id))
    analysis = result.scalar_one_or_none()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    if analysis.status != "completed":
        raise HTTPException(status_code=400, detail="Analysis not yet completed")

    cached_answer = await get_cached_chat(req.analysis_id, req.question)
    if cached_answer:
        return ChatResponse(answer=cached_answer, sources=["analysis_data", "cache"])

    context = _build_chat_context(analysis)

    if _has_openai():
        answer = _ai_chat(req.question, context, analysis.business_type)
    else:
        answer = _rule_based_answer(req.question, analysis)

    await set_cached_chat(req.analysis_id, req.question, answer)

    return ChatResponse(answer=answer, sources=["analysis_data"])


def _build_chat_context(analysis: AnalysisResult) -> str:
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


def _ai_chat(question: str, context: str, business_type: str) -> str:
    result = _call_openai(
        system_prompt=(
            "You are a friendly and expert business data analyst assistant. "
            f"You are helping analyze a {business_type} business. "
            "Answer the user's question based on the analysis data provided. "
            "Be specific -- reference actual numbers, field names, and values. "
            "If asked for advice, give actionable business recommendations. "
            "Answer in the same language as the user's question. "
            "Keep answers concise but informative (2-5 sentences)."
        ),
        user_prompt=f"ANALYSIS DATA:\n{context}\n\nUSER QUESTION: {question}",
    )
    return result or "I couldn't process that question. Please try rephrasing."


def _rule_based_answer(question: str, analysis: AnalysisResult) -> str:
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
        "Try asking about: KPIs, insights, recommendations, or a summary.\n"
        "For full AI chat, add your OpenAI API key to backend/.env"
    )
