from sqlalchemy import Column, String, DateTime, ForeignKey, Text, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.database import Base


class Strategy(Base):
    __tablename__ = "strategies"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    interview_id = Column(UUID(as_uuid=True), ForeignKey("interviews.id"), nullable=False)

    # Strategy content (JSON fields)
    brand_summary = Column(Text, nullable=True)
    target_audience = Column(JSON, nullable=True)  # JSON array of personas
    recommended_channels = Column(JSON, nullable=True)  # JSON array of platforms with reasoning
    content_pillars = Column(JSON, nullable=True)  # JSON array of content themes
    brand_voice = Column(Text, nullable=True)
    posting_frequency = Column(JSON, nullable=True)  # JSON object with frequency per platform

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User", back_populates="strategies")
    interview = relationship("Interview", back_populates="strategies")
    posts = relationship("Post", back_populates="strategy", cascade="all, delete-orphan")
