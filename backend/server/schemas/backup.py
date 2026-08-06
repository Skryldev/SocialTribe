from pydantic import BaseModel


class BackupCreateRequest(BaseModel):
    name: str | None = None