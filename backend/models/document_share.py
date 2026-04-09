from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import relationship

from config.database import Base


class DocumentShare(Base):
    __tablename__ = "document_shares"

    id            = Column(Integer, primary_key=True, index=True)
    document_id   = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    shared_by_id  = Column(Integer, ForeignKey("users.id",     ondelete="CASCADE"), nullable=False)
    shared_with_id = Column(Integer, ForeignKey("users.id",    ondelete="CASCADE"), nullable=False, index=True)
    permission    = Column(String(20), nullable=False, default="lecture")  # lecture | modification
    date_partage  = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Contrainte d'unicité : un document ne peut être partagé qu'une fois avec un utilisateur
    __table_args__ = (
        UniqueConstraint("document_id", "shared_with_id", name="uq_doc_shared_with"),
    )

    # Relations
    document     = relationship("Document", foreign_keys=[document_id])
    partage_par  = relationship("User",     foreign_keys=[shared_by_id])
    partage_avec = relationship("User",     foreign_keys=[shared_with_id])
