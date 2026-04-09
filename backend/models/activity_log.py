from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from config.database import Base


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id          = Column(Integer, primary_key=True, index=True)
    user_id     = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    action      = Column(String(20), nullable=False, index=True)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="SET NULL"), nullable=True, index=True)
    details     = Column(Text, nullable=True)
    adresse_ip  = Column(String(50), nullable=True)
    date_action = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    # Relations (one-way — pas de back_populates pour ne pas modifier User/Document)
    user     = relationship("User",     foreign_keys=[user_id])
    document = relationship("Document", foreign_keys=[document_id])

    def __repr__(self) -> str:
        return f"<ActivityLog id={self.id} action={self.action!r} user_id={self.user_id}>"
