from sqlalchemy import Column, String, DateTime, ForeignKey, JSON, Boolean, Time
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime, time
import uuid

from app.database import Base


class UserSettings(Base):
    __tablename__ = "settings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, unique=True)

    # Auto-approval settings
    auto_approval_enabled = Column(Boolean, default=False, nullable=False)
    auto_approval_platforms = Column(JSON, nullable=True)  # JSON array of platforms

    # Default posting preferences
    default_posting_time = Column(Time, default=time(9, 0), nullable=True)  # 9:00 AM
    timezone = Column(String, default="UTC", nullable=False)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User", back_populates="settings")
