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
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB limit
CHUNK_SIZE = 1024 * 1024          # 1 MB chunk


class UploadService:
    async def process_uploads(self, db: AsyncSession, files: list[FastAPIUpload]) -> list[Upload]:
        os.makedirs(settings.upload_dir, exist_ok=True)
        results = []

        for file in files:
            if not file.filename or not is_allowed_file(file.filename):
                raise ValueError(f"Tipe file tidak didukung: {file.filename}")

            file_id = str(uuid.uuid4())
            ext = os.path.splitext(file.filename)[1]
            stored_name = f"{file_id.replace('-', '')}{ext}"
            file_path = os.path.join(settings.upload_dir, stored_name)

            file_size = 0
            try:
                async with aiofiles.open(file_path, "wb") as f:
                    while chunk := await file.read(CHUNK_SIZE):
                        file_size += len(chunk)
                        if file_size > MAX_FILE_SIZE:
                            raise ValueError(f"Ukuran file {file.filename} melebihi batas maksimal 50MB")
                        await f.write(chunk)
            except Exception:
                if os.path.exists(file_path):
                    os.remove(file_path)
                raise

            upload_record = await upload_repo.create(db, obj_in={
                "id": file_id,
                "filename": stored_name,
                "original_name": file.filename,
                "file_type": get_file_type(file.filename),
                "file_size": file_size,
                "status": "uploaded",
            })
            results.append(upload_record)

        return results

    async def get_recent_uploads(self, db: AsyncSession, limit: int = 50) -> list[Upload]:
        return await upload_repo.get_multi(db, limit=limit)


upload_service = UploadService()
