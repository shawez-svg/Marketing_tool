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

    # Strategy content
    brand_summary = Column(Text, nullable=True)
    target_audience = Column(JSON, nullable=True)  # JSON array of personas
    value_proposition = Column(Text, nullable=True)  # Unique value statement
    recommended_channels = Column(JSON, nullable=True)  # JSON array of platforms with reasoning
    content_pillars = Column(JSON, nullable=True)  # JSON array of content themes
    posting_schedule = Column(JSON, nullable=True)  # JSON object with schedule details
    tone_and_voice = Column(JSON, nullable=True)  # JSON object with brand voice details
    hashtag_strategy = Column(JSON, nullable=True)  # JSON array of hashtag categories
    content_ideas = Column(JSON, nullable=True)  # JSON array of content ideas
    content_calendar = Column(JSON, nullable=True)  # AI-generated 90-day content calendar with post counts per platform

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=True)

    # Relationships
    user = relationship("User", back_populates="strategies")
    interview = relationship("Interview", back_populates="strategies")
    posts = relationship("Post", back_populates="strategy", cascade="all, delete-orphan")
