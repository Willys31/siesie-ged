from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import relationship

from config.database import Base


class DocumentVersion(Base):
    __tablename__ = "document_versions"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(
        Integer,
        ForeignKey("documents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    numero_version = Column(Integer, nullable=False)
    chemin_fichier = Column(String, nullable=False)
    modifie_par_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date_modification = Column(DateTime, default=datetime.utcnow, nullable=False)
    commentaire = Column(Text)

    __table_args__ = (
        UniqueConstraint("document_id", "numero_version", name="uq_version_doc_num"),
    )

    # Relations
    document = relationship("Document", back_populates="versions")
    modifie_par = relationship(
        "User",
        back_populates="versions_modifiees",
        foreign_keys=[modifie_par_id],
    )

    def __repr__(self) -> str:
        return f"<DocumentVersion doc_id={self.document_id} v{self.numero_version}>"
