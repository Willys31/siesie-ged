"""
Service de gestion du partage de documents.

share_document            — créer ou mettre à jour un partage
get_shares_for_document   — liste des partages d'un document (avec noms)
revoke_share              — révoquer un partage
list_shared_with_me       — documents partagés avec l'utilisateur courant
get_share_access          — vérifier si un utilisateur a accès via partage
get_all_shares_for_doc    — tous les partages d'un document (pour notifications)
"""

from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from models.document import Document
from models.document_share import DocumentShare


async def share_document(
    db:              AsyncSession,
    doc_id:          int,
    shared_by_id:    int,
    shared_with_id:  int,
    permission:      str = "lecture",
) -> DocumentShare:
    """
    Crée ou met à jour (upsert) un partage.
    Lève IntegrityError si la contrainte unique est violée (géré par le router).
    """
    # Vérifier si un partage existe déjà
    result = await db.execute(
        select(DocumentShare).where(
            DocumentShare.document_id   == doc_id,
            DocumentShare.shared_with_id == shared_with_id,
        )
    )
    share = result.scalar_one_or_none()

    if share:
        # Mettre à jour la permission
        share.permission = permission
        await db.flush()
        return share

    share = DocumentShare(
        document_id=doc_id,
        shared_by_id=shared_by_id,
        shared_with_id=shared_with_id,
        permission=permission,
    )
    db.add(share)
    await db.flush()
    return share


async def get_shares_for_document(
    db:     AsyncSession,
    doc_id: int,
) -> list[dict]:
    """Retourne la liste des partages avec les noms des utilisateurs."""
    result = await db.execute(
        select(DocumentShare)
        .options(
            selectinload(DocumentShare.partage_par),
            selectinload(DocumentShare.partage_avec),
        )
        .where(DocumentShare.document_id == doc_id)
        .order_by(DocumentShare.date_partage.desc())
    )
    shares = list(result.scalars().all())

    return [
        {
            "id":              s.id,
            "document_id":     s.document_id,
            "shared_by_id":    s.shared_by_id,
            "shared_by_nom":   s.partage_par.nom_complet  if s.partage_par  else None,
            "shared_with_id":  s.shared_with_id,
            "shared_with_nom": s.partage_avec.nom_complet if s.partage_avec else None,
            "permission":      s.permission,
            "date_partage":    s.date_partage,
        }
        for s in shares
    ]


async def revoke_share(
    db:       AsyncSession,
    share_id: int,
    doc_id:   int,
) -> bool:
    result = await db.execute(
        select(DocumentShare).where(
            DocumentShare.id          == share_id,
            DocumentShare.document_id == doc_id,
        )
    )
    share = result.scalar_one_or_none()
    if share is None:
        return False
    await db.delete(share)
    await db.flush()
    return True


async def list_shared_with_me(
    db:      AsyncSession,
    user_id: int,
    skip:    int = 0,
    limit:   int = 20,
) -> tuple[list[dict], int]:
    """Documents partagés avec l'utilisateur (non archivés)."""
    count_result = await db.execute(
        select(func.count())
        .select_from(DocumentShare)
        .join(Document, Document.id == DocumentShare.document_id)
        .where(
            DocumentShare.shared_with_id == user_id,
            Document.est_archive == False,  # noqa: E712
        )
    )
    total: int = count_result.scalar_one()

    result = await db.execute(
        select(DocumentShare)
        .options(
            selectinload(DocumentShare.document).selectinload(Document.tags),
            selectinload(DocumentShare.partage_par),
        )
        .join(Document, Document.id == DocumentShare.document_id)
        .where(
            DocumentShare.shared_with_id == user_id,
            Document.est_archive == False,  # noqa: E712
        )
        .order_by(DocumentShare.date_partage.desc())
        .offset(skip)
        .limit(limit)
    )
    shares = list(result.scalars().all())

    return [
        {
            "share_id":      s.id,
            "permission":    s.permission,
            "shared_by_nom": s.partage_par.nom_complet if s.partage_par else None,
            "date_partage":  s.date_partage,
            "document":      s.document,
        }
        for s in shares
    ], total


async def get_share_access(
    db:                   AsyncSession,
    doc_id:               int,
    user_id:              int,
    required_permission:  str = "lecture",
) -> Optional[DocumentShare]:
    """
    Retourne le partage si l'utilisateur a l'accès requis, None sinon.
    required_permission="lecture"      → accepte lecture ET modification
    required_permission="modification" → accepte uniquement modification
    """
    q = select(DocumentShare).where(
        DocumentShare.document_id    == doc_id,
        DocumentShare.shared_with_id == user_id,
    )
    if required_permission == "modification":
        q = q.where(DocumentShare.permission == "modification")

    result = await db.execute(q)
    return result.scalar_one_or_none()


async def get_all_shares_for_doc(
    db:     AsyncSession,
    doc_id: int,
) -> list[DocumentShare]:
    """Retourne tous les partages d'un document (pour créer des notifications)."""
    result = await db.execute(
        select(DocumentShare).where(DocumentShare.document_id == doc_id)
    )
    return list(result.scalars().all())
