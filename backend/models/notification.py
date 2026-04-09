from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from config.database import Base


class Notification(Base):
    __tablename__ = "notifications"

    id             = Column(Integer, primary_key=True, index=True)
    user_id        = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    type           = Column(String(20), nullable=False)   # share | modify | delete | restore | system
    titre          = Column(String(200), nullable=False)
    message        = Column(Text, nullable=False)
    document_id    = Column(Integer, ForeignKey("documents.id", ondelete="SET NULL"), nullable=True, index=True)
    est_lue        = Column(Boolean, default=False, nullable=False, index=True)
    date_creation  = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    # Relations (one-way, no back_populates to avoid touching existing models)
    user     = relationship("User",     foreign_keys=[user_id])
    document = relationship("Document", foreign_keys=[document_id])
