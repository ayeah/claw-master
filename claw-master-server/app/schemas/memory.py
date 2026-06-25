from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime


class MemoryBase(BaseModel):
    content: str
    type: str  # short_term, long_term
    tags: Optional[List[str]] = []
    metadata: Optional[Dict[str, Any]] = {}
    expires_at: Optional[datetime] = None


class MemoryCreate(MemoryBase):
    pass


class MemoryUpdate(BaseModel):
    content: Optional[str] = None
    type: Optional[str] = None
    tags: Optional[List[str]] = None
    metadata: Optional[Dict[str, Any]] = None
    expires_at: Optional[datetime] = None


class MemoryResponse(MemoryBase):
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class MemorySearchRequest(BaseModel):
    query: str
    type: Optional[str] = "all"
    limit: Optional[int] = 10
    threshold: Optional[float] = 0.5
    tags: Optional[List[str]] = None


class MemorySearchResult(BaseModel):
    memories: List[MemoryResponse]
    scores: List[float]