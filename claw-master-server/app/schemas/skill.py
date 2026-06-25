from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime


class SkillBase(BaseModel):
    name: str
    description: Optional[str] = ""
    version: Optional[str] = "1.0.0"
    author: Optional[str] = ""
    enabled: Optional[bool] = True
    type: str
    schema_input: Optional[Dict[str, Any]] = {}
    schema_output: Optional[Dict[str, Any]] = {}
    config: Optional[Dict[str, Any]] = {}


class SkillCreate(SkillBase):
    pass


class SkillUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    version: Optional[str] = None
    author: Optional[str] = None
    enabled: Optional[bool] = None
    type: Optional[str] = None
    schema_input: Optional[Dict[str, Any]] = None
    schema_output: Optional[Dict[str, Any]] = None
    config: Optional[Dict[str, Any]] = None


class SkillResponse(SkillBase):
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SkillExecutionRequest(BaseModel):
    skill_id: str
    input: Dict[str, Any] = {}
    context: Optional[Dict[str, Any]] = None
    options: Optional[Dict[str, Any]] = None


class SkillExecutionResponse(BaseModel):
    id: str
    skill_id: str
    output: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    duration: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True