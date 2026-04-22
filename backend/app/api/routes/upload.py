import os
from typing import List

from fastapi import APIRouter, Depends, HTTPException, UploadFile as FastAPIUpload
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.schemas import UploadResponse
from app.services.upload_service import upload_service

router = APIRouter(tags=["upload"])


@router.post("/upload", response_model=List[UploadResponse])
async def upload_files(
    files: List[FastAPIUpload],
    db: AsyncSession = Depends(get_db),
):
    try:
        results = await upload_service.process_uploads(db, files)
        return results
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/uploads", response_model=List[UploadResponse])
async def list_uploads(db: AsyncSession = Depends(get_db)):
    return await upload_service.get_recent_uploads(db)

