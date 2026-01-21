from sqlalchemy import Column, String, DateTime, ForeignKey, Text, JSON, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum

from app.database import Base


class Platform(str, enum.Enum):
    LINKEDIN = "linkedin"
    INSTAGRAM = "instagram"
    TWITTER = "twitter"
    FACEBOOK = "facebook"
    TIKTOK = "tiktok"


class PostStatus(str, enum.Enum):
    DRAFT = "draft"
    APPROVED = "approved"
    REJECTED = "rejected"
    SCHEDULED = "scheduled"
    POSTED = "posted"
    FAILED = "failed"


class Post(Base):
    __tablename__ = "posts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    strategy_id = Column(UUID(as_uuid=True), ForeignKey("strategies.id"), nullable=False)

    platform = Column(Enum(Platform), nullable=False)
    content_text = Column(Text, nullable=False)
    content_media_url = Column(String, nullable=True)
    tags = Column(JSON, nullable=True)  # JSON array of tags/hashtags
    status = Column(Enum(PostStatus), default=PostStatus.DRAFT, nullable=False)

    # Timing
    scheduled_time = Column(DateTime, nullable=True)
    posted_at = Column(DateTime, nullable=True)
    suggested_time = Column(DateTime, nullable=True)

    # Platform-specific data
    platform_post_id = Column(String, nullable=True)  # ID from social media platform

    # Content categorization
    content_pillar = Column(String, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User", back_populates="posts")
    strategy = relationship("Strategy", back_populates="posts")
