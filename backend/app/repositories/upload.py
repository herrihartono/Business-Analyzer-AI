from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.upload import Upload
from app.repositories.base import BaseRepository

class UploadRepository(BaseRepository[Upload]):
    def __init__(self):
        super().__init__(Upload)

upload_repo = UploadRepository()
