from sqlalchemy import Column, String, Integer, Text, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from ..database import Base


def generate_uuid():
    return str(uuid.uuid4())


class Skill(Base):
    __tablename__ = "skills"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text, default="")
    version = Column(String, default="1.0.0")
    author = Column(String, default="")
    enabled = Column(Boolean, default=True)
    type = Column(String, nullable=False)  # function, http, shell, agent
    schema_input = Column(Text, default="{}")
    schema_output = Column(Text, default="{}")
    config = Column(Text, default="{}")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    executions = relationship("SkillExecution", back_populates="skill")


class SkillExecution(Base):
    __tablename__ = "skill_executions"

    id = Column(String, primary_key=True, default=generate_uuid)
    skill_id = Column(String, ForeignKey("skills.id"), nullable=False)
    input_data = Column(Text, default="{}")
    output_data = Column(Text, default="{}")
    error = Column(Text, nullable=True)
    duration = Column(Integer, default=0)
    status = Column(String, default="pending")  # pending, running, completed, failed
    created_at = Column(DateTime, default=datetime.utcnow)

    skill = relationship("Skill", back_populates="executions")