from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship

from config.database import Base


class Tag(Base):
    __tablename__ = "tags"

    id = Column(Integer, primary_key=True, index=True)
    nom = Column(String, unique=True, nullable=False, index=True)

    # Relation many-to-many via la table d'association document_tags
    documents = relationship(
        "Document",
        secondary="document_tags",
        back_populates="tags",
    )

    def __repr__(self) -> str:
        return f"<Tag id={self.id} nom={self.nom!r}>"
