from sqlalchemy import Column, String, DateTime, Integer, Enum, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum

from app.database import Base


class InterviewStatus(str, enum.Enum):
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"


class Interview(Base):
    __tablename__ = "interviews"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    audio_file_url = Column(String, nullable=True)
    transcript = Column(Text, nullable=True)
    duration_seconds = Column(Integer, nullable=True)
    status = Column(Enum(InterviewStatus), default=InterviewStatus.IN_PROGRESS, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime, nullable=True)

    # Relationships
    user = relationship("User", back_populates="interviews")
    strategies = relationship("Strategy", back_populates="interview", cascade="all, delete-orphan")
