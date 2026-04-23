import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.schemas import ChatRequest, ChatResponse
from app.services.chat_service import chat_service

router = APIRouter(tags=["chat"])


@router.post("/chat", response_model=ChatResponse)
async def chat_with_data(
    req: ChatRequest,
    db: AsyncSession = Depends(get_db),
):
    try:
        if not req.analysis_id and not req.upload_id:
            raise HTTPException(status_code=400, detail="Either analysis_id or upload_id is required")

        response_data = await chat_service.get_chat_response(
            db,
            question=req.question,
            analysis_id=req.analysis_id,
            upload_id=req.upload_id,
        )
        return ChatResponse(**response_data)
    except ValueError as e:
        raise HTTPException(status_code=400 if "not yet completed" in str(e) else 404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")

