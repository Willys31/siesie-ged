from datetime import datetime

from sqlalchemy import BigInteger, Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from config.database import Base


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    titre = Column(String, nullable=False, index=True)
    description = Column(Text)
    type_fichier = Column(String)               # extension ou MIME type (ex: "pdf", "image/png")
    taille_fichier = Column(BigInteger)         # taille en octets
    chemin_stockage = Column(String, nullable=False)
    uploaded_par_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date_upload = Column(DateTime, default=datetime.utcnow, nullable=False)
    date_modification = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    est_archive = Column(Boolean, default=False, nullable=False)

    # Relations
    uploade_par = relationship(
        "User",
        back_populates="documents_uploades",
        foreign_keys=[uploaded_par_id],
    )
    versions = relationship(
        "DocumentVersion",
        back_populates="document",
        cascade="all, delete-orphan",
        order_by="DocumentVersion.numero_version",
    )
    tags = relationship(
        "Tag",
        secondary="document_tags",
        back_populates="documents",
    )
    permissions = relationship(
        "Permission",
        back_populates="document",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Document id={self.id} titre={self.titre!r}>"
