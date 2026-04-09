import enum
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Enum, Integer, String
from sqlalchemy.orm import relationship

from config.database import Base


class UserRole(str, enum.Enum):
    admin = "admin"
    utilisateur = "utilisateur"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    nom_complet = Column(String, nullable=False)
    mot_de_passe_hash = Column(String, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.utilisateur, nullable=False)
    date_creation = Column(DateTime, default=datetime.utcnow, nullable=False)
    est_actif = Column(Boolean, default=True, nullable=False)
    avatar_path = Column(String, nullable=True)

    # Relations
    documents_uploades = relationship(
        "Document",
        back_populates="uploade_par",
        foreign_keys="Document.uploaded_par_id",
    )
    versions_modifiees = relationship(
        "DocumentVersion",
        back_populates="modifie_par",
        foreign_keys="DocumentVersion.modifie_par_id",
    )
    permissions = relationship("Permission", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email!r} role={self.role}>"
