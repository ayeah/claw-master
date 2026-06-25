from sqlalchemy import Column, String, Integer, Text, DateTime, JSON
from datetime import datetime
import uuid

from ..database import Base


def generate_uuid():
    return str(uuid.uuid4())


class File(Base):
    __tablename__ = "files"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, nullable=False)
    name = Column(String, nullable=False)
    path = Column(String, nullable=False)
    type = Column(String, nullable=False)  # file, directory
    size = Column(Integer, default=0)
    mime_type = Column(String, nullable=True)
    content = Column(Text, nullable=True)
    metadata = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)