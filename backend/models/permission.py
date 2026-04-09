from sqlalchemy import Boolean, Column, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import relationship

from config.database import Base


class Permission(Base):
    """Droits d'accès d'un utilisateur sur un document spécifique."""

    __tablename__ = "permissions"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(
        Integer,
        ForeignKey("documents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    peut_lire = Column(Boolean, default=True, nullable=False)
    peut_modifier = Column(Boolean, default=False, nullable=False)
    peut_supprimer = Column(Boolean, default=False, nullable=False)

    __table_args__ = (
        UniqueConstraint("document_id", "user_id", name="uq_permission_doc_user"),
    )

    # Relations
    document = relationship("Document", back_populates="permissions")
    user = relationship("User", back_populates="permissions")

    def __repr__(self) -> str:
        return (
            f"<Permission doc={self.document_id} user={self.user_id} "
            f"lire={self.peut_lire} modifier={self.peut_modifier} supprimer={self.peut_supprimer}>"
        )
