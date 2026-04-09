"""
Tables d'association many-to-many.
Définies ici pour éviter les imports circulaires.
"""
from sqlalchemy import Column, ForeignKey, Integer, Table

from config.database import Base

document_tags = Table(
    "document_tags",
    Base.metadata,
    Column(
        "document_id",
        Integer,
        ForeignKey("documents.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "tag_id",
        Integer,
        ForeignKey("tags.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)
