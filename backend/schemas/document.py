from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


# ── Tags ──────────────────────────────────────────────────────────────────────

class TagSchema(BaseModel):
    id: int
    nom: str

    model_config = {"from_attributes": True}


# ── Documents ─────────────────────────────────────────────────────────────────

class DocumentCreate(BaseModel):
    titre: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    tags: List[str] = []


class DocumentUpdate(BaseModel):
    titre: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    tags: Optional[List[str]] = None


class DocumentResponse(BaseModel):
    id: int
    titre: str
    description: Optional[str] = None
    type_fichier: Optional[str] = None
    taille_fichier: Optional[int] = None
    uploaded_par_id: int
    date_upload: datetime
    date_modification: Optional[datetime] = None
    est_archive: bool
    tags: List[TagSchema] = []

    model_config = {"from_attributes": True}


class DocumentList(BaseModel):
    items: List[DocumentResponse]
    total: int
    skip: int
    limit: int


# ── Versions ──────────────────────────────────────────────────────────────────

class DocumentVersionResponse(BaseModel):
    id: int
    document_id: int
    numero_version: int
    modifie_par_id: int
    date_modification: datetime
    commentaire: Optional[str] = None

    model_config = {"from_attributes": True}


# ── Recherche ─────────────────────────────────────────────────────────────────

class SearchHit(BaseModel):
    id: int
    titre: str
    description: Optional[str] = None
    type_fichier: Optional[str] = None
    tags: List[str] = []
    date_upload: Optional[datetime] = None
    score: float
    # Champs mis en surbrillance : {"titre": ["...texte <em>terme</em>..."], ...}
    highlights: Dict[str, List[str]] = {}


class SearchResponse(BaseModel):
    items: List[SearchHit]
    total: int
    query: str
