from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from ...database import get_db
from ...models.memory import Memory
from ...schemas.memory import (
    MemoryCreate,
    MemoryUpdate,
    MemoryResponse,
    MemorySearchRequest,
    MemorySearchResult,
)
from ...core.security import get_current_user

router = APIRouter(prefix="/memory", tags=["memory"])


@router.get("/", response_model=List[MemoryResponse])
def list_memories(
    type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    query = db.query(Memory).filter(Memory.user_id == current_user["id"])
    if type:
        query = query.filter(Memory.type == type)
    memories = query.all()
    return memories


@router.post("/", response_model=MemoryResponse)
def add_memory(
    memory_data: MemoryCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    memory = Memory(
        user_id=current_user["id"],
        content=memory_data.content,
        type=memory_data.type,
        tags=memory_data.tags,
        metadata=memory_data.metadata,
        expires_at=memory_data.expires_at,
    )
    db.add(memory)
    db.commit()
    db.refresh(memory)
    return memory


@router.get("/{memory_id}", response_model=MemoryResponse)
def get_memory(
    memory_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    memory = (
        db.query(Memory)
        .filter(Memory.id == memory_id, Memory.user_id == current_user["id"])
        .first()
    )
    if not memory:
        raise HTTPException(status_code=404, detail="Memory not found")
    return memory


@router.put("/{memory_id}", response_model=MemoryResponse)
def update_memory(
    memory_id: str,
    memory_data: MemoryUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    memory = (
        db.query(Memory)
        .filter(Memory.id == memory_id, Memory.user_id == current_user["id"])
        .first()
    )
    if not memory:
        raise HTTPException(status_code=404, detail="Memory not found")

    update_data = memory_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(memory, key, value)

    db.commit()
    db.refresh(memory)
    return memory


@router.delete("/{memory_id}")
def delete_memory(
    memory_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    memory = (
        db.query(Memory)
        .filter(Memory.id == memory_id, Memory.user_id == current_user["id"])
        .first()
    )
    if not memory:
        raise HTTPException(status_code=404, detail="Memory not found")

    db.delete(memory)
    db.commit()
    return {"message": "Memory deleted"}


@router.post("/search", response_model=MemorySearchResult)
def search_memories(
    request: MemorySearchRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    query = db.query(Memory).filter(Memory.user_id == current_user["id"])

    if request.type and request.type != "all":
        query = query.filter(Memory.type == request.type)

    if request.tags:
        query = query.filter(Memory.tags.overlap(request.tags))

    memories = query.all()

    # Simple text matching (in production, use vector similarity)
    query_lower = request.query.lower()
    scored = []
    for memory in memories:
        content_lower = memory.content.lower()
        if query_lower in content_lower:
            score = 1.0
        else:
            query_words = query_lower.split()
            content_words = content_lower.split()
            match_count = sum(1 for w in query_words if any(cw in w for cw in content_words))
            score = match_count / len(query_words) if query_words else 0

        if score >= request.threshold:
            scored.append((memory, score))

    scored.sort(key=lambda x: x[1], reverse=True)
    scored = scored[: request.limit]

    return MemorySearchResult(
        memories=[m for m, _ in scored],
        scores=[s for _, s in scored],
    )


@router.post("/cleanup")
def cleanup_expired_memories(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    now = datetime.utcnow()
    deleted = (
        db.query(Memory)
        .filter(
            Memory.user_id == current_user["id"],
            Memory.expires_at.isnot(None),
            Memory.expires_at < now,
        )
        .delete()
    )
    db.commit()
    return {"deleted": deleted}