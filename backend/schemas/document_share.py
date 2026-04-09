from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel

from schemas.document import DocumentResponse, TagSchema


class ShareCreate(BaseModel):
    user_id:    int
    permission: str = "lecture"   # lecture | modification


class ShareOut(BaseModel):
    id:              int
    document_id:     int
    shared_by_id:    int
    shared_by_nom:   Optional[str] = None
    shared_with_id:  int
    shared_with_nom: Optional[str] = None
    permission:      str
    date_partage:    datetime


class SharedDocumentResponse(BaseModel):
    """DocumentResponse enrichi des informations de partage."""
    # ── Champs Document ─────────────────────────────────────────────────────────
    id:                int
    titre:             str
    description:       Optional[str] = None
    type_fichier:      Optional[str] = None
    taille_fichier:    Optional[int] = None
    uploaded_par_id:   int
    date_upload:       datetime
    date_modification: Optional[datetime] = None
    est_archive:       bool
    tags:              List[TagSchema] = []
    # ── Champs Partage ──────────────────────────────────────────────────────────
    share_id:          int
    shared_by_nom:     Optional[str] = None
    permission:        str
    date_partage:      datetime


class SharedDocumentList(BaseModel):
    items: List[SharedDocumentResponse]
    total: int
    skip:  int
    limit: int
