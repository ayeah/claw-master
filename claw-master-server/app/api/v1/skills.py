from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
import json

from ...database import get_db
from ...models.skill import Skill, SkillExecution
from ...schemas.skill import (
    SkillCreate,
    SkillUpdate,
    SkillResponse,
    SkillExecutionRequest,
    SkillExecutionResponse,
)
from ...core.security import get_current_user

router = APIRouter(prefix="/skills", tags=["skills"])


@router.get("/", response_model=List[SkillResponse])
def list_skills(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    skills = db.query(Skill).filter(Skill.user_id == current_user["id"]).all()
    return skills


@router.post("/", response_model=SkillResponse)
def create_skill(
    skill_data: SkillCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    skill = Skill(
        user_id=current_user["id"],
        name=skill_data.name,
        description=skill_data.description,
        version=skill_data.version,
        author=skill_data.author,
        enabled=skill_data.enabled,
        type=skill_data.type,
        schema_input=json.dumps(skill_data.schema_input),
        schema_output=json.dumps(skill_data.schema_output),
        config=json.dumps(skill_data.config),
    )
    db.add(skill)
    db.commit()
    db.refresh(skill)
    return skill


@router.get("/{skill_id}", response_model=SkillResponse)
def get_skill(
    skill_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    skill = (
        db.query(Skill)
        .filter(Skill.id == skill_id, Skill.user_id == current_user["id"])
        .first()
    )
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")
    return skill


@router.put("/{skill_id}", response_model=SkillResponse)
def update_skill(
    skill_id: str,
    skill_data: SkillUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    skill = (
        db.query(Skill)
        .filter(Skill.id == skill_id, Skill.user_id == current_user["id"])
        .first()
    )
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")

    update_data = skill_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if key in ["schema_input", "schema_output", "config"]:
            setattr(skill, key, json.dumps(value))
        else:
            setattr(skill, key, value)

    db.commit()
    db.refresh(skill)
    return skill


@router.delete("/{skill_id}")
def delete_skill(
    skill_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    skill = (
        db.query(Skill)
        .filter(Skill.id == skill_id, Skill.user_id == current_user["id"])
        .first()
    )
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")

    db.delete(skill)
    db.commit()
    return {"message": "Skill deleted"}


@router.post("/{skill_id}/execute", response_model=SkillExecutionResponse)
def execute_skill(
    skill_id: str,
    request: SkillExecutionRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    skill = (
        db.query(Skill)
        .filter(Skill.id == skill_id, Skill.user_id == current_user["id"])
        .first()
    )
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")

    if not skill.enabled:
        raise HTTPException(status_code=400, detail="Skill is disabled")

    execution = SkillExecution(
        skill_id=skill_id,
        input_data=json.dumps(request.input),
        status="running",
    )
    db.add(execution)
    db.commit()
    db.refresh(execution)

    # TODO: Execute skill based on type
    # For now, return placeholder
    execution.output_data = json.dumps({"result": "Skill execution not implemented yet"})
    execution.status = "completed"
    execution.duration = 0
    db.commit()
    db.refresh(execution)

    return execution