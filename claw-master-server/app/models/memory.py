from sqlalchemy import Column, String, Integer, Text, Boolean, DateTime, JSON
from datetime import datetime
import uuid

from ..database import Base


def generate_uuid():
    return str(uuid.uuid4())


class Memory(Base):
    __tablename__ = "memories"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    type = Column(String, nullable=False)  # short_term, long_term
    tags = Column(JSON, default=list)
    embedding = Column(JSON, nullable=True)
    metadata = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)