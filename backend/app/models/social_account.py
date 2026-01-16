from sqlalchemy import Column, String, DateTime, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.database import Base
from app.models.post import Platform


class SocialAccount(Base):
    __tablename__ = "social_accounts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    platform = Column(Enum(Platform), nullable=False)
    platform_user_id = Column(String, nullable=False)
    access_token = Column(String, nullable=False)  # Should be encrypted in production
    refresh_token = Column(String, nullable=True)  # Should be encrypted in production

    connected_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User", back_populates="social_accounts")
