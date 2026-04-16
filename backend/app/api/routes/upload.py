import os
import uuid
from typing import List

import aiofiles
from fastapi import APIRouter, Depends, HTTPException, UploadFile as FastAPIUpload
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.models.upload import Upload
from app.models.schemas import UploadResponse
from app.utils.helpers import get_file_type, is_allowed_file

router = APIRouter(tags=["upload"])
settings = get_settings()


@router.post("/upload", response_model=List[UploadResponse])
async def upload_files(
    files: List[FastAPIUpload],
    db: AsyncSession = Depends(get_db),
):
    os.makedirs(settings.upload_dir, exist_ok=True)
    results = []

    for file in files:
        if not file.filename or not is_allowed_file(file.filename):
            raise HTTPException(
                status_code=400,
                detail=f"File type not allowed: {file.filename}",
            )

        file_id = uuid.uuid4()
        ext = os.path.splitext(file.filename)[1]
        stored_name = f"{file_id.hex}{ext}"
        file_path = os.path.join(settings.upload_dir, stored_name)

        content = await file.read()
        async with aiofiles.open(file_path, "wb") as f:
            await f.write(content)

        upload = Upload(
            id=file_id,
            filename=stored_name,
            original_name=file.filename,
            file_type=get_file_type(file.filename),
            file_size=len(content),
            status="uploaded",
        )
        db.add(upload)
        results.append(upload)

    await db.flush()

    return results


@router.get("/uploads", response_model=List[UploadResponse])
async def list_uploads(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Upload).order_by(Upload.created_at.desc()).limit(50)
    )
    return result.scalars().all()
