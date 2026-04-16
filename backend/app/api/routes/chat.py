import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.models.analysis import AnalysisResult
from app.models.schemas import ChatRequest, ChatResponse

router = APIRouter(tags=["chat"])
settings = get_settings()


@router.post("/chat", response_model=ChatResponse)
async def chat_with_data(
    req: ChatRequest,
    db: AsyncSession = Depends(get_db),
):
    analysis = await db.get(AnalysisResult, req.analysis_id)
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    if analysis.status != "completed":
        raise HTTPException(status_code=400, detail="Analysis not yet completed")

    context = _build_chat_context(analysis)

    if settings.openai_api_key and settings.openai_api_key != "sk-your-key-here":
        answer = await _llm_answer(req.question, context)
    else:
        answer = _rule_based_answer(req.question, analysis)

    return ChatResponse(answer=answer, sources=["analysis_data"])


def _build_chat_context(analysis: AnalysisResult) -> str:
    parts = [
        f"Business Type: {analysis.business_type}",
        f"Summary: {analysis.summary}",
    ]

    if analysis.kpis:
        parts.append("KPIs:")
        for kpi in analysis.kpis:
            parts.append(f"  - {kpi.get('name', '')}: {kpi.get('value', '')}")

    if analysis.insights:
        parts.append("Insights:")
        for ins in analysis.insights:
            parts.append(f"  - {ins.get('title', '')}: {ins.get('description', '')}")

    if analysis.column_stats:
        parts.append("Column Statistics:")
        parts.append(json.dumps(analysis.column_stats, indent=2, default=str)[:2000])

    if analysis.raw_data_preview:
        parts.append("Sample Data (first 5 rows):")
        for row in analysis.raw_data_preview[:5]:
            parts.append(f"  {json.dumps(row, default=str)}")

    return "\n".join(parts)


async def _llm_answer(question: str, context: str) -> str:
    try:
        from langchain_openai import ChatOpenAI
        from langchain_core.messages import SystemMessage, HumanMessage

        llm = ChatOpenAI(
            model="gpt-4o-mini",
            api_key=settings.openai_api_key,
            temperature=0.3,
        )

        system_prompt = (
            "You are a helpful business data analyst assistant. "
            "Answer the user's question based ONLY on the provided data context. "
            "Be concise, specific, and reference actual numbers from the data. "
            "If the data doesn't contain enough info to answer, say so."
        )

        response = llm.invoke([
            SystemMessage(content=f"{system_prompt}\n\nData Context:\n{context}"),
            HumanMessage(content=question),
        ])

        return response.content
    except Exception as e:
        return f"AI chat error: {str(e)}. Please check your API key configuration."


def _rule_based_answer(question: str, analysis: AnalysisResult) -> str:
    q = question.lower()

    if any(kw in q for kw in ["summary", "overview", "tell me about"]):
        return analysis.summary or "No summary available for this analysis."

    if any(kw in q for kw in ["kpi", "metric", "number", "total", "value"]):
        if analysis.kpis:
            lines = ["Here are the key metrics:"]
            for kpi in analysis.kpis:
                lines.append(f"  - {kpi.get('name', '')}: {kpi.get('value', '')}")
            return "\n".join(lines)
        return "No KPI data available."

    if any(kw in q for kw in ["insight", "finding", "discover"]):
        if analysis.insights:
            lines = ["Key insights from the analysis:"]
            for ins in analysis.insights:
                lines.append(f"  - {ins.get('title', '')}: {ins.get('description', '')}")
            return "\n".join(lines)
        return "No insights available."

    if any(kw in q for kw in ["recommend", "suggest", "should", "action"]):
        if analysis.recommendations:
            lines = ["Recommendations:"]
            for rec in analysis.recommendations:
                lines.append(f"  - [{rec.get('priority', '')}] {rec.get('title', '')}: {rec.get('description', '')}")
            return "\n".join(lines)
        return "No recommendations available."

    return (
        f"Based on the {analysis.business_type} analysis: {analysis.summary or 'Analysis completed.'} "
        "For more specific answers, try asking about KPIs, insights, or recommendations. "
        "Configure an OpenAI API key for full AI chat capabilities."
    )
