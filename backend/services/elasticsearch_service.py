"""
Service de recherche full-text.

Stratégie de sélection (au runtime) :
  - Si ELASTICSEARCH_URL est défini → Elasticsearch (ESService).
  - Sinon → PostgreSQL ts_vector / ts_query (fallback natif).

L'interface publique est unique :
    unified_search_with_filters(db, query, user_id, ...) → {"hits": [...], "total": int}

Les routers importent uniquement `unified_search_with_filters` et, si nécessaire,
`es_service` pour l'indexation (index_document / delete_document restent best-effort
et ignorés automatiquement quand ES n'est pas configuré).
"""

import logging
from datetime import date
from typing import Optional

from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from config.settings import settings

logger = logging.getLogger(__name__)

# ── Mapping Elasticsearch ─────────────────────────────────────────────────────

_INDEX_MAPPINGS = {
    "properties": {
        "titre":           {"type": "text",    "analyzer": "french"},
        "description":     {"type": "text",    "analyzer": "french"},
        "tags":            {"type": "keyword"},
        "type_fichier":    {"type": "keyword"},
        "uploaded_par_id": {"type": "integer"},
        "date_upload":     {"type": "date"},
    }
}


# ── ESService (utilisé uniquement si ELASTICSEARCH_URL est défini) ────────────

class ESService:
    def __init__(self) -> None:
        self._client = None
        self._index_ready: bool = False
        self.index: str = settings.ES_INDEX_DOCUMENTS

    @property
    def enabled(self) -> bool:
        return bool(settings.ELASTICSEARCH_URL)

    @property
    def client(self):
        if self._client is None:
            from elasticsearch import AsyncElasticsearch
            self._client = AsyncElasticsearch(settings.ELASTICSEARCH_URL)
        return self._client

    async def _ensure_index(self) -> None:
        if self._index_ready:
            return
        try:
            exists = await self.client.indices.exists(index=self.index)
            if not exists:
                await self.client.indices.create(index=self.index, mappings=_INDEX_MAPPINGS)
                logger.info("Index Elasticsearch '%s' créé.", self.index)
            else:
                await self.client.indices.put_mapping(index=self.index, body=_INDEX_MAPPINGS)
            self._index_ready = True
        except Exception as exc:
            logger.warning("_ensure_index échoué : %s", exc)

    async def index_document(self, document) -> None:
        """Indexe un document dans ES. No-op si ES n'est pas configuré."""
        if not self.enabled:
            return
        try:
            await self._ensure_index()
            await self.client.index(
                index=self.index,
                id=str(document.id),
                document={
                    "titre":           document.titre,
                    "description":     document.description,
                    "tags":            [t.nom for t in document.tags],
                    "type_fichier":    document.type_fichier,
                    "uploaded_par_id": document.uploaded_par_id,
                    "date_upload": (
                        document.date_upload.isoformat() if document.date_upload else None
                    ),
                },
            )
        except Exception as exc:
            logger.warning("Indexation ES échouée pour doc %s : %s", document.id, exc)

    async def delete_document(self, doc_id: int) -> None:
        """Supprime de l'index ES. No-op si ES n'est pas configuré."""
        if not self.enabled:
            return
        try:
            from elasticsearch import NotFoundError
            await self.client.delete(index=self.index, id=str(doc_id))
        except Exception as exc:
            # NotFoundError silencieux
            if "NotFoundError" not in type(exc).__name__:
                logger.warning("Suppression ES échouée pour doc %s : %s", doc_id, exc)

    async def search_with_filters(
        self,
        query: str,
        user_id: int,
        type_fichier: Optional[str] = None,
        date_debut: Optional[str] = None,
        date_fin: Optional[str] = None,
        tags: Optional[list[str]] = None,
        size: int = 20,
    ) -> dict:
        try:
            await self._ensure_index()

            filters: list[dict] = [{"term": {"uploaded_par_id": user_id}}]
            if type_fichier:
                filters.append({"wildcard": {"type_fichier": f"*{type_fichier}*"}})
            if date_debut or date_fin:
                date_range: dict = {}
                if date_debut:
                    date_range["gte"] = date_debut
                if date_fin:
                    date_range["lte"] = date_fin
                filters.append({"range": {"date_upload": date_range}})
            if tags:
                filters.append({"terms": {"tags": [t.lower() for t in tags]}})

            es_query = {
                "bool": {
                    "must": {
                        "multi_match": {
                            "query": query,
                            "fields": ["titre^3", "description^2", "tags"],
                            "type": "best_fields",
                            "fuzziness": "AUTO",
                        }
                    },
                    "filter": filters,
                }
            }
            highlight_cfg = {
                "pre_tags": ["<em>"],
                "post_tags": ["</em>"],
                "fields": {
                    "titre":       {"number_of_fragments": 0},
                    "description": {"number_of_fragments": 3, "fragment_size": 150},
                },
            }

            response = await self.client.search(
                index=self.index, query=es_query, highlight=highlight_cfg, size=size,
            )

            hits = []
            for hit in response["hits"]["hits"]:
                src = hit["_source"]
                raw_hl = hit.get("highlight", {})
                hits.append({
                    "id":           int(hit["_id"]),
                    "titre":        src.get("titre", ""),
                    "description":  src.get("description"),
                    "type_fichier": src.get("type_fichier"),
                    "tags":         src.get("tags", []),
                    "date_upload":  src.get("date_upload"),
                    "score":        hit["_score"],
                    "highlights":   dict(raw_hl),
                })

            return {"hits": hits, "total": response["hits"]["total"]["value"]}

        except Exception as exc:
            logger.warning("Recherche ES échouée : %s", exc)
            return {"hits": [], "total": 0}


# Singleton partagé entre routers et services
es_service = ESService()


# ── Fallback PostgreSQL FTS ───────────────────────────────────────────────────

async def _pg_search_with_filters(
    db: AsyncSession,
    query: str,
    user_id: int,
    type_fichier: Optional[str] = None,
    date_debut: Optional[str] = None,
    date_fin: Optional[str] = None,
    tags: Optional[list[str]] = None,
    size: int = 20,
) -> dict:
    """
    Recherche full-text PostgreSQL via ts_vector / plainto_tsquery.

    Retourne le même format que ESService.search_with_filters :
        {"hits": [...], "total": int}
    Les highlights sont vides (non supportés côté SQL).
    """
    from models.document import Document
    from models.associations import document_tags as doc_tags_table
    from models.tag import Tag

    # Expression ts_vector sur titre + description
    ts_vec = func.to_tsvector(
        "french",
        func.coalesce(Document.titre, "") + " " + func.coalesce(Document.description, ""),
    )
    ts_q = func.plainto_tsquery("french", query)
    rank_col = func.ts_rank(ts_vec, ts_q).label("rank")

    # Filtres de base
    base_filters = [
        Document.est_archive.is_(False),
        Document.uploaded_par_id == user_id,
        ts_vec.op("@@")(ts_q),
    ]
    if type_fichier:
        base_filters.append(Document.type_fichier.ilike(f"%{type_fichier}%"))
    if date_debut:
        base_filters.append(Document.date_upload >= date_debut)
    if date_fin:
        base_filters.append(Document.date_upload <= date_fin)

    # Requête principale
    stmt = (
        select(Document, rank_col)
        .where(*base_filters)
        .options(selectinload(Document.tags))
        .order_by(rank_col.desc())
        .limit(size)
    )

    # Sous-requête pour le COUNT (mêmes filtres, sans limit)
    count_subq = select(Document.id).where(*base_filters)

    if tags:
        tag_lower = [t.lower() for t in tags]
        stmt = (
            stmt
            .join(doc_tags_table, doc_tags_table.c.document_id == Document.id)
            .join(Tag, Tag.id == doc_tags_table.c.tag_id)
            .where(Tag.nom.in_(tag_lower))
            .distinct()
        )
        count_subq = (
            select(Document.id)
            .where(*base_filters)
            .join(doc_tags_table, doc_tags_table.c.document_id == Document.id)
            .join(Tag, Tag.id == doc_tags_table.c.tag_id)
            .where(Tag.nom.in_(tag_lower))
            .distinct()
        )

    count_stmt = select(func.count()).select_from(count_subq.subquery())

    rows        = (await db.execute(stmt)).all()
    total       = (await db.execute(count_stmt)).scalar() or 0

    hits = []
    for doc, score in rows:
        hits.append({
            "id":           doc.id,
            "titre":        doc.titre,
            "description":  doc.description,
            "type_fichier": doc.type_fichier,
            "tags":         [t.nom for t in doc.tags],
            "date_upload":  doc.date_upload.isoformat() if doc.date_upload else None,
            "score":        float(score) if score else 0.0,
            "highlights":   {},
        })

    return {"hits": hits, "total": total}


# ── Interface unifiée (utilisée par le router) ────────────────────────────────

async def unified_search_with_filters(
    db: AsyncSession,
    query: str,
    user_id: int,
    type_fichier: Optional[str] = None,
    date_debut: Optional[str] = None,
    date_fin: Optional[str] = None,
    tags: Optional[list[str]] = None,
    size: int = 20,
) -> dict:
    """
    Dispatche vers Elasticsearch ou PostgreSQL FTS selon la configuration.
    La session `db` n'est utilisée que pour le fallback PG.
    """
    if settings.ELASTICSEARCH_URL:
        return await es_service.search_with_filters(
            query=query,
            user_id=user_id,
            type_fichier=type_fichier,
            date_debut=date_debut,
            date_fin=date_fin,
            tags=tags,
            size=size,
        )
    return await _pg_search_with_filters(
        db=db,
        query=query,
        user_id=user_id,
        type_fichier=type_fichier,
        date_debut=date_debut,
        date_fin=date_fin,
        tags=tags,
        size=size,
    )
