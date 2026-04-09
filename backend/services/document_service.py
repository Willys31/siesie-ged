"""
Service métier pour la gestion des documents.

Responsabilités :
- Stockage physique des fichiers (UUID + extension d'origine)
- CRUD asynchrone en base (AsyncSession)
- Contrôle d'accès : propriétaire OU admin
- Gestion des versions (DocumentVersion)
- Résolution et création des tags (get-or-create)
- Indexation Elasticsearch (best-effort)
"""

import os
import uuid
from datetime import datetime
from typing import Optional

import aiofiles
from fastapi import HTTPException, UploadFile
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from config.settings import settings
from models.document import Document
from models.document_share import DocumentShare
from models.document_version import DocumentVersion
from models.tag import Tag
from models.user import UserRole
from schemas.document import DocumentCreate, DocumentUpdate
from services.elasticsearch_service import es_service


# ── Helpers privés ────────────────────────────────────────────────────────────

async def _save_file(file: UploadFile) -> tuple[str, int, str]:
    """
    Valide et écrit le fichier sur disque avec un nom UUID unique.
    Retourne (chemin_stockage, taille_octets, content_type).
    """
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

    original_name = file.filename or "fichier"
    ext = original_name.rsplit(".", 1)[-1].lower() if "." in original_name else "bin"
    if ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Extension .{ext} non autorisée. "
                f"Formats acceptés : {', '.join(settings.ALLOWED_EXTENSIONS)}"
            ),
        )

    content = await file.read()
    if len(content) > settings.MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"Fichier trop volumineux (max {settings.MAX_FILE_SIZE // 1024 // 1024} MB)",
        )

    unique_name = f"{uuid.uuid4()}.{ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, unique_name)

    async with aiofiles.open(file_path, "wb") as f:
        await f.write(content)

    return file_path, len(content), file.content_type or f"application/{ext}"


async def _resolve_tags(db: AsyncSession, tag_names: list[str]) -> list[Tag]:
    """Get-or-create pour chaque tag (normalisé en minuscules)."""
    tags: list[Tag] = []
    seen: set[str] = set()
    for raw in tag_names:
        name = raw.strip().lower()
        if not name or name in seen:
            continue
        seen.add(name)
        result = await db.execute(select(Tag).where(Tag.nom == name))
        tag = result.scalar_one_or_none()
        if tag is None:
            tag = Tag(nom=name)
            db.add(tag)
            await db.flush()
        tags.append(tag)
    return tags


async def _get_doc_with_access(
    db:                AsyncSession,
    doc_id:            int,
    user_id:           int,
    is_admin:          bool = False,
    shared_permission: Optional[str] = None,
) -> Optional[Document]:
    """
    Retourne le document si l'utilisateur y a accès :
    - propriétaire ou admin : toujours
    - sinon, si shared_permission est fourni, vérifie un DocumentShare correspondant
      ("lecture" → accepte lecture + modification ; "modification" → seulement modification)
    """
    filters = [Document.id == doc_id]
    if not is_admin:
        filters.append(Document.uploaded_par_id == user_id)

    result = await db.execute(
        select(Document)
        .where(*filters)
        .options(selectinload(Document.tags))
    )
    doc = result.scalar_one_or_none()
    if doc is not None:
        return doc

    # Accès via partage (non-admin uniquement)
    if shared_permission and not is_admin:
        q = (
            select(Document)
            .join(
                DocumentShare,
                (DocumentShare.document_id    == Document.id) &
                (DocumentShare.shared_with_id == user_id),
            )
            .where(Document.id == doc_id)
            .options(selectinload(Document.tags))
        )
        if shared_permission == "modification":
            q = q.where(DocumentShare.permission == "modification")
        result = await db.execute(q)
        return result.scalar_one_or_none()

    return None


# ── CRUD principal ────────────────────────────────────────────────────────────

async def create_document(
    db: AsyncSession,
    payload: DocumentCreate,
    file: UploadFile,
    user_id: int,
) -> Document:
    file_path, file_size, content_type = await _save_file(file)
    tags = await _resolve_tags(db, payload.tags)

    doc = Document(
        titre=payload.titre,
        description=payload.description,
        type_fichier=content_type,
        taille_fichier=file_size,
        chemin_stockage=file_path,
        uploaded_par_id=user_id,
    )
    doc.tags = tags
    db.add(doc)
    await db.flush()
    await db.refresh(doc, attribute_names=["tags"])
    await es_service.index_document(doc)
    return doc


async def list_documents(
    db: AsyncSession,
    user_id: int,
    skip: int = 0,
    limit: int = 20,
    is_admin: bool = False,
) -> tuple[list[Document], int]:
    if is_admin:
        base_q = select(Document).where(Document.est_archive == False)  # noqa: E712
    else:
        base_q = select(Document).where(
            Document.uploaded_par_id == user_id,
            Document.est_archive == False,  # noqa: E712
        )
    count_result = await db.execute(select(func.count()).select_from(base_q.subquery()))
    total: int = count_result.scalar_one()

    result = await db.execute(
        base_q
        .options(selectinload(Document.tags))
        .order_by(Document.date_upload.desc())
        .offset(skip)
        .limit(limit)
    )
    return list(result.scalars().all()), total


async def get_user_stats(db: AsyncSession, user_id: int) -> dict:
    """Retourne le nombre de documents et l'espace total utilisé pour un utilisateur."""
    result = await db.execute(
        select(
            func.count(Document.id),
            func.coalesce(func.sum(Document.taille_fichier), 0),
        ).where(
            Document.uploaded_par_id == user_id,
            Document.est_archive == False,  # noqa: E712
        )
    )
    count, total_size = result.one()
    return {"document_count": int(count), "total_size": int(total_size)}


async def get_document(
    db: AsyncSession,
    doc_id: int,
    user_id: int,
    is_admin: bool = False,
) -> Optional[Document]:
    return await _get_doc_with_access(db, doc_id, user_id, is_admin, shared_permission="lecture")


async def update_document(
    db: AsyncSession,
    doc_id: int,
    payload: DocumentUpdate,
    user_id: int,
    is_admin: bool = False,
) -> Optional[Document]:
    doc = await _get_doc_with_access(db, doc_id, user_id, is_admin, shared_permission="modification")
    if doc is None:
        return None

    if payload.titre is not None:
        doc.titre = payload.titre
    if payload.description is not None:
        doc.description = payload.description
    if payload.tags is not None:
        doc.tags = await _resolve_tags(db, payload.tags)

    await db.flush()
    await db.refresh(doc, attribute_names=["tags"])
    await es_service.index_document(doc)
    return doc


async def archive_document(
    db: AsyncSession,
    doc_id: int,
    user_id: int,
    is_admin: bool = False,
) -> Optional[Document]:
    """Archivage logique : est_archive=True. Le fichier physique est conservé."""
    # Archivage : propriétaire ou admin uniquement (pas de partage)
    doc = await _get_doc_with_access(db, doc_id, user_id, is_admin)
    if doc is None:
        return None

    doc.est_archive = True
    await db.flush()
    # Retirer de l'index de recherche (best-effort)
    await es_service.delete_document(doc_id)
    return doc


# ── Remplacement de fichier + versioning ─────────────────────────────────────

async def replace_file(
    db: AsyncSession,
    doc_id: int,
    file: UploadFile,
    user_id: int,
    commentaire: str = "",
    is_admin: bool = False,
) -> Optional[Document]:
    """
    Remplace le fichier courant par un nouveau :
    1. Sauvegarde l'ancien chemin dans DocumentVersion (numéro incrémenté).
    2. Écrit le nouveau fichier sur disque.
    3. Met à jour les métadonnées du document.
    4. Ré-indexe dans Elasticsearch.
    """
    doc = await _get_doc_with_access(db, doc_id, user_id, is_admin, shared_permission="modification")
    if doc is None:
        return None

    # Prochain numéro de version
    version_result = await db.execute(
        select(func.max(DocumentVersion.numero_version)).where(
            DocumentVersion.document_id == doc_id
        )
    )
    next_version_num: int = (version_result.scalar_one_or_none() or 0) + 1

    # Archiver l'ancien fichier comme version
    old_version = DocumentVersion(
        document_id=doc_id,
        numero_version=next_version_num,
        chemin_fichier=doc.chemin_stockage,
        modifie_par_id=user_id,
        date_modification=datetime.utcnow(),
        commentaire=commentaire or f"Remplacement automatique — version {next_version_num}",
    )
    db.add(old_version)

    # Écrire le nouveau fichier
    file_path, file_size, content_type = await _save_file(file)
    doc.chemin_stockage = file_path
    doc.taille_fichier = file_size
    doc.type_fichier = content_type
    doc.date_modification = datetime.utcnow()

    await db.flush()
    await db.refresh(doc, attribute_names=["tags"])
    await es_service.index_document(doc)
    return doc


# ── Versions ──────────────────────────────────────────────────────────────────

async def get_versions(
    db: AsyncSession,
    doc_id: int,
    user_id: int,
    is_admin: bool = False,
) -> Optional[list[DocumentVersion]]:
    """Retourne la liste des versions d'un document, None si accès refusé."""
    doc = await _get_doc_with_access(db, doc_id, user_id, is_admin, shared_permission="lecture")
    if doc is None:
        return None

    result = await db.execute(
        select(DocumentVersion)
        .where(DocumentVersion.document_id == doc_id)
        .order_by(DocumentVersion.numero_version.asc())
    )
    return list(result.scalars().all())


async def get_version(
    db: AsyncSession,
    doc_id: int,
    version_id: int,
    user_id: int,
    is_admin: bool = False,
) -> Optional[DocumentVersion]:
    """Retourne une version spécifique, None si accès refusé ou introuvable."""
    doc = await _get_doc_with_access(db, doc_id, user_id, is_admin, shared_permission="lecture")
    if doc is None:
        return None

    result = await db.execute(
        select(DocumentVersion).where(
            DocumentVersion.id == version_id,
            DocumentVersion.document_id == doc_id,
        )
    )
    return result.scalar_one_or_none()


# ── Corbeille ─────────────────────────────────────────────────────────────────

async def list_trash(
    db: AsyncSession,
    user_id: int,
    skip: int = 0,
    limit: int = 20,
    is_admin: bool = False,
) -> tuple[list[Document], int]:
    """Liste les documents archivés (corbeille)."""
    if is_admin:
        base_q = select(Document).where(Document.est_archive == True)  # noqa: E712
    else:
        base_q = select(Document).where(
            Document.uploaded_par_id == user_id,
            Document.est_archive == True,  # noqa: E712
        )

    count_result = await db.execute(select(func.count()).select_from(base_q.subquery()))
    total: int = count_result.scalar_one()

    result = await db.execute(
        base_q
        .options(selectinload(Document.tags))
        .order_by(Document.date_modification.desc())
        .offset(skip)
        .limit(limit)
    )
    return list(result.scalars().all()), total


async def restore_document(
    db: AsyncSession,
    doc_id: int,
    user_id: int,
    is_admin: bool = False,
) -> Optional[Document]:
    """Restaure un document archivé (est_archive → False) et le ré-indexe dans ES."""
    filters = [Document.id == doc_id, Document.est_archive == True]  # noqa: E712
    if not is_admin:
        filters.append(Document.uploaded_par_id == user_id)

    result = await db.execute(
        select(Document).where(*filters).options(selectinload(Document.tags))
    )
    doc = result.scalar_one_or_none()
    if doc is None:
        return None

    doc.est_archive = False
    await db.flush()
    await es_service.index_document(doc)
    return doc


async def delete_permanently(
    db: AsyncSession,
    doc_id: int,
) -> bool:
    """
    Suppression définitive (admin seulement) :
    - Supprime les fichiers physiques (document + versions)
    - Supprime l'entrée en base (cascade sur DocumentVersion, Permission, etc.)
    - Retire de l'index Elasticsearch
    """
    result = await db.execute(
        select(Document)
        .where(Document.id == doc_id)
        .options(selectinload(Document.versions))
    )
    doc = result.scalar_one_or_none()
    if doc is None:
        return False

    # Suppression des fichiers physiques
    if os.path.exists(doc.chemin_stockage):
        try:
            os.remove(doc.chemin_stockage)
        except OSError:
            pass

    for version in doc.versions:
        if os.path.exists(version.chemin_fichier):
            try:
                os.remove(version.chemin_fichier)
            except OSError:
                pass

    await db.delete(doc)
    await db.flush()
    await es_service.delete_document(doc_id)
    return True


async def empty_trash(
    db: AsyncSession,
    user_id: int,
    is_admin: bool = False,
) -> int:
    """
    Vide la corbeille (admin : tous les docs archivés ; user : ses propres docs archivés).
    Retourne le nombre de documents supprimés définitivement.
    """
    if is_admin:
        base_q = select(Document).where(Document.est_archive == True)  # noqa: E712
    else:
        base_q = select(Document).where(
            Document.uploaded_par_id == user_id,
            Document.est_archive == True,  # noqa: E712
        )

    result = await db.execute(
        base_q.options(selectinload(Document.versions))
    )
    docs = list(result.scalars().all())

    count = 0
    for doc in docs:
        if os.path.exists(doc.chemin_stockage):
            try:
                os.remove(doc.chemin_stockage)
            except OSError:
                pass
        for version in doc.versions:
            if os.path.exists(version.chemin_fichier):
                try:
                    os.remove(version.chemin_fichier)
                except OSError:
                    pass
        await es_service.delete_document(doc.id)
        await db.delete(doc)
        count += 1

    if count:
        await db.flush()

    return count
