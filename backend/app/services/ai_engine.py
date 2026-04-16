from __future__ import annotations

import json
import hashlib
from typing import Any

import polars as pl
import redis

from app.config import get_settings

settings = get_settings()

_redis: redis.Redis | None = None


def _get_redis() -> redis.Redis | None:
    global _redis
    if _redis is None:
        try:
            _redis = redis.from_url(settings.redis_url, decode_responses=True)
            _redis.ping()
        except Exception:
            _redis = None
    return _redis


def _cache_key(data_hash: str, prompt_type: str) -> str:
    return f"smartbiz:ai:{prompt_type}:{data_hash}"


def _hash_data(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()[:16]


def _build_data_context(df: pl.DataFrame, kpis: list[dict], business_type: str) -> str:
    """Build a compact text representation of the data for the LLM."""
    lines = [
        f"Business Type: {business_type}",
        f"Rows: {len(df)}, Columns: {len(df.columns)}",
        f"Column Names: {', '.join(df.columns)}",
        "",
        "Column Types:",
    ]
    for col in df.columns:
        lines.append(f"  - {col}: {df[col].dtype}")

    lines.append("")
    lines.append("Sample Data (first 5 rows):")
    for row in df.head(5).to_dicts():
        lines.append(f"  {json.dumps(row, default=str)}")

    if kpis:
        lines.append("")
        lines.append("Calculated KPIs:")
        for kpi in kpis:
            lines.append(f"  - {kpi['name']}: {kpi['value']}")

    return "\n".join(lines)


def generate_insights(
    df: pl.DataFrame,
    business_type: str,
    kpis: list[dict],
    trends: list[dict],
) -> list[dict[str, Any]]:
    """Generate AI-powered insights. Uses LangChain if API key is available, otherwise rule-based."""
    context = _build_data_context(df, kpis, business_type)
    data_hash = _hash_data(context)

    r = _get_redis()
    if r:
        cached = r.get(_cache_key(data_hash, "insights"))
        if cached:
            return json.loads(cached)

    if settings.openai_api_key and settings.openai_api_key != "sk-your-key-here":
        insights = _llm_insights(context, business_type)
    else:
        insights = _rule_based_insights(df, business_type, kpis, trends)

    if r:
        r.setex(_cache_key(data_hash, "insights"), 3600, json.dumps(insights))

    return insights


def _llm_insights(context: str, business_type: str) -> list[dict[str, Any]]:
    """Use LangChain + OpenAI to generate insights."""
    try:
        from langchain_openai import ChatOpenAI
        from langchain_core.messages import SystemMessage, HumanMessage

        llm = ChatOpenAI(
            model="gpt-4o-mini",
            api_key=settings.openai_api_key,
            temperature=0.3,
        )

        system_prompt = (
            "You are a senior business analyst. Analyze the provided data and return "
            "exactly 5 insights as a JSON array. Each insight must have: "
            '"title" (short heading), "description" (2-3 sentences), '
            '"severity" (one of: info, warning, critical, success), '
            '"category" (e.g. Revenue, Operations, Risk, Growth, Efficiency). '
            "Return ONLY the JSON array, no other text."
        )

        response = llm.invoke([
            SystemMessage(content=system_prompt),
            HumanMessage(content=f"Data context:\n{context}"),
        ])

        parsed = json.loads(response.content)
        return parsed if isinstance(parsed, list) else []
    except Exception:
        return _rule_based_insights_fallback()


def generate_recommendations(
    df: pl.DataFrame,
    business_type: str,
    kpis: list[dict],
    insights: list[dict],
) -> list[dict[str, Any]]:
    """Generate AI recommendations. Uses LLM if available, otherwise rule-based."""
    context = _build_data_context(df, kpis, business_type)
    data_hash = _hash_data(context)

    r = _get_redis()
    if r:
        cached = r.get(_cache_key(data_hash, "recommendations"))
        if cached:
            return json.loads(cached)

    if settings.openai_api_key and settings.openai_api_key != "sk-your-key-here":
        recs = _llm_recommendations(context, business_type)
    else:
        recs = _rule_based_recommendations(business_type, kpis)

    if r:
        r.setex(_cache_key(data_hash, "recommendations"), 3600, json.dumps(recs))

    return recs


def _llm_recommendations(context: str, business_type: str) -> list[dict[str, Any]]:
    try:
        from langchain_openai import ChatOpenAI
        from langchain_core.messages import SystemMessage, HumanMessage

        llm = ChatOpenAI(
            model="gpt-4o-mini",
            api_key=settings.openai_api_key,
            temperature=0.3,
        )

        system_prompt = (
            "You are a senior business consultant. Based on the data, provide "
            "exactly 4 actionable recommendations as a JSON array. Each must have: "
            '"title", "description" (2-3 sentences of specific action), '
            '"priority" (high, medium, low), "impact" (short expected outcome). '
            "Return ONLY the JSON array."
        )

        response = llm.invoke([
            SystemMessage(content=system_prompt),
            HumanMessage(content=f"Business type: {business_type}\nData:\n{context}"),
        ])

        parsed = json.loads(response.content)
        return parsed if isinstance(parsed, list) else []
    except Exception:
        return _rule_based_recommendations(business_type, [])


def _rule_based_insights(
    df: pl.DataFrame,
    business_type: str,
    kpis: list[dict],
    trends: list[dict],
) -> list[dict[str, Any]]:
    insights = []

    insights.append({
        "title": "Dataset Overview",
        "description": f"Your {business_type} dataset contains {len(df)} records across {len(df.columns)} columns. This provides a solid foundation for analysis.",
        "severity": "info",
        "category": "Overview",
    })

    null_pct = sum(df[c].null_count() for c in df.columns) / (len(df) * len(df.columns)) * 100
    if null_pct > 10:
        insights.append({
            "title": "Data Quality Alert",
            "description": f"Approximately {null_pct:.1f}% of values are missing. This may affect analysis accuracy. Consider improving data collection processes.",
            "severity": "warning",
            "category": "Data Quality",
        })
    else:
        insights.append({
            "title": "Good Data Quality",
            "description": f"Only {null_pct:.1f}% of values are missing. Your data quality is above average for this type of dataset.",
            "severity": "success",
            "category": "Data Quality",
        })

    for trend in trends[:2]:
        if trend["direction"] == "up":
            insights.append({
                "title": f"Growth in {trend['column']}",
                "description": f"{trend['column']} shows a {trend['change_percent']}% increase from first half to second half of data. This upward trend suggests positive momentum.",
                "severity": "success",
                "category": "Growth",
            })
        elif trend["direction"] == "down":
            insights.append({
                "title": f"Decline in {trend['column']}",
                "description": f"{trend['column']} decreased by {abs(trend['change_percent'])}%. Investigate root causes and consider corrective actions.",
                "severity": "warning",
                "category": "Risk",
            })

    if len(insights) < 4:
        insights.append({
            "title": "Analysis Complete",
            "description": f"All available metrics for your {business_type} data have been processed. Review KPIs and charts for detailed breakdowns.",
            "severity": "info",
            "category": "Summary",
        })

    return insights[:5]


def _rule_based_insights_fallback() -> list[dict[str, Any]]:
    return [{
        "title": "AI Insights Unavailable",
        "description": "Could not generate AI insights. Please check your OpenAI API key configuration.",
        "severity": "warning",
        "category": "System",
    }]


def _rule_based_recommendations(business_type: str, kpis: list[dict]) -> list[dict[str, Any]]:
    recs = [
        {
            "title": "Automate Data Collection",
            "description": "Set up automated data pipelines to reduce manual entry errors and ensure consistent data quality across all departments.",
            "priority": "high",
            "impact": "Reduce data errors by up to 40%",
        },
        {
            "title": "Establish KPI Monitoring",
            "description": f"Create a {business_type} dashboard with real-time KPI tracking. Monitor key metrics weekly to catch anomalies early.",
            "priority": "high",
            "impact": "Faster response to business changes",
        },
        {
            "title": "Expand Data Sources",
            "description": "Integrate additional data sources to get a more complete picture. Cross-referencing datasets often reveals hidden patterns.",
            "priority": "medium",
            "impact": "Deeper analytical insights",
        },
        {
            "title": "Regular Trend Reviews",
            "description": "Schedule monthly trend analysis sessions with stakeholders. Early detection of shifts enables proactive decision-making.",
            "priority": "medium",
            "impact": "Improved strategic planning",
        },
    ]
    return recs
