"""
Router /api/search

GET /api/search — recherche full-text avec filtres et surbrillance.

Paramètres :
  q           (obligatoire) — texte à rechercher
  type        (optionnel)   — filtre par extension/MIME, ex: "pdf", "image/png"
  date_debut  (optionnel)   — date ISO YYYY-MM-DD (inclusive)
  date_fin    (optionnel)   — date ISO YYYY-MM-DD (inclusive)
  tags        (optionnel)   — tags séparés par virgules, ex: "facture,2024"
  size        (optionnel)   — nombre de résultats (défaut 20, max 100)

Réponse : SearchResponse avec highlights <em>terme</em> dans titre et description
          (highlights disponibles uniquement avec Elasticsearch).
"""

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from config.database import get_db
from models.user import User
from schemas.document import SearchHit, SearchResponse
from services.auth import get_current_active_user
from services.elasticsearch_service import unified_search_with_filters

router = APIRouter()


@router.get("/", response_model=SearchResponse)
async def search(
    q: str = Query(..., min_length=1, description="Texte à rechercher"),
    type: Optional[str] = Query(
        None,
        alias="type",
        description='Filtre par type : extension courte ("pdf") ou MIME complet ("application/pdf")',
    ),
    date_debut: Optional[date] = Query(
        None, description="Date de début (YYYY-MM-DD, inclusive)"
    ),
    date_fin: Optional[date] = Query(
        None, description="Date de fin (YYYY-MM-DD, inclusive)"
    ),
    tags: Optional[str] = Query(
        None, description='Tags séparés par virgules, ex: "facture,2024"'
    ),
    size: int = Query(20, ge=1, le=100, description="Nombre de résultats"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Recherche full-text dans les documents de l'utilisateur connecté.

    Utilise Elasticsearch si ELASTICSEARCH_URL est configuré, sinon
    PostgreSQL ts_vector / plainto_tsquery comme fallback natif.
    """
    tag_list = [t.strip() for t in tags.split(",") if t.strip()] if tags else None

    result = await unified_search_with_filters(
        db=db,
        query=q,
        user_id=current_user.id,
        type_fichier=type,
        date_debut=date_debut.isoformat() if date_debut else None,
        date_fin=date_fin.isoformat() if date_fin else None,
        tags=tag_list,
        size=size,
    )

    items = [SearchHit(**hit) for hit in result["hits"]]
    return SearchResponse(items=items, total=result["total"], query=q)
