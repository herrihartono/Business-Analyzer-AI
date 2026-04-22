import os
import uuid
import aiofiles
from fastapi import UploadFile as FastAPIUpload
from sqlalchemy.ext.asyncio import AsyncSession
from app.config import get_settings
from app.models.upload import Upload
from app.repositories.upload import upload_repo
from app.utils.helpers import get_file_type, is_allowed_file

settings = get_settings()

class UploadService:
    async def process_uploads(self, db: AsyncSession, files: list[FastAPIUpload]) -> list[Upload]:
        os.makedirs(settings.upload_dir, exist_ok=True)
        results = []

        for file in files:
            if not file.filename or not is_allowed_file(file.filename):
                raise ValueError(f"File type not allowed: {file.filename}")

            file_id = str(uuid.uuid4())
            ext = os.path.splitext(file.filename)[1]
            stored_name = f"{file_id.replace('-', '')}{ext}"
            file_path = os.path.join(settings.upload_dir, stored_name)

            content = await file.read()
            async with aiofiles.open(file_path, "wb") as f:
                await f.write(content)

            upload_record = await upload_repo.create(db, obj_in={
                "id": file_id,
                "filename": stored_name,
                "original_name": file.filename,
                "file_type": get_file_type(file.filename),
                "file_size": len(content),
                "status": "uploaded",
            })
            results.append(upload_record)

        return results

    async def get_recent_uploads(self, db: AsyncSession, limit: int = 50) -> list[Upload]:
        return await upload_repo.get_multi(db, limit=limit)

upload_service = UploadService()
