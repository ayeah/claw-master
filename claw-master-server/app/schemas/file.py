from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime


class FileBase(BaseModel):
    name: str
    path: str
    type: str  # file, directory
    size: Optional[int] = 0
    mime_type: Optional[str] = None
    content: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = {}


class FileCreate(BaseModel):
    path: str
    content: Optional[str] = None


class FileUpdate(BaseModel):
    content: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class FileResponse(FileBase):
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class FileOperation(BaseModel):
    type: str  # create, read, update, delete, move, copy
    path: str
    new_path: Optional[str] = None
    content: Optional[str] = None
    options: Optional[Dict[str, Any]] = None