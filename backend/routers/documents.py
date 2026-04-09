"""
Router /api/documents

Routes :
  POST   /upload                            — upload initial
  GET    /                                  — liste paginée
  GET    /trash                             — corbeille (docs archivés)
  DELETE /trash                             — vider la corbeille
  GET    /shared-with-me                    — documents partagés avec moi
  GET    /{id}                              — détail
  PUT    /{id}                              — modifier titre/description/tags
  DELETE /{id}                              — archivage logique
  PUT    /{id}/restore                      — restaurer depuis la corbeille
  DELETE /{id}/permanent                    — suppression définitive (admin)
  GET    /{id}/download                     — télécharger le fichier courant
  GET    /{id}/preview                      — aperçu inline
  PUT    /{id}/replace                      — remplacer le fichier (crée une version)
  GET    /{id}/versions                     — liste des versions
  GET    /{id}/versions/{vid}/download      — télécharger une version spécifique
  POST   /{id}/share                        — partager un document
  GET    /{id}/shares                       — liste des partages
  DELETE /{id}/shares/{share_id}            — révoquer un partage

Accès : toutes les routes requièrent un JWT valide.
"""

import mimetypes
import os
from typing import Optional

import aiofiles
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, UploadFile
from fastapi.responses import FileResponse, PlainTextResponse
from sqlalchemy.ext.asyncio import AsyncSession

from config.database import get_db
from models.user import User, UserRole
from schemas.document import (
    DocumentCreate,
    DocumentList,
    DocumentResponse,
    DocumentUpdate,
    DocumentVersionResponse,
)
from schemas.document_share import ShareCreate, ShareOut, SharedDocumentList, SharedDocumentResponse
from services import activity_service, document_service, notification_service, share_service
from services.auth import get_current_active_user

router = APIRouter()


# ── Helpers ───────────────────────────────────────────────────────────────────

def _is_admin(user: User) -> bool:
    return user.role == UserRole.admin


def _client_ip(request: Request) -> Optional[str]:
    return request.client.host if request.client else None


def _file_response(file_path: str, display_name: str) -> FileResponse:
    media_type, _ = mimetypes.guess_type(file_path)
    return FileResponse(
        path=file_path,
        filename=display_name,
        media_type=media_type or "application/octet-stream",
    )


# ── Upload ────────────────────────────────────────────────────────────────────

@router.post("/upload", response_model=DocumentResponse, status_code=201)
async def upload_document(
    request: Request,
    titre: str = Form(..., description="Titre du document"),
    description: Optional[str] = Form(None),
    tags: str = Form("", description="Tags séparés par virgules, ex: facture,2024"),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    tag_list = [t.strip() for t in tags.split(",") if t.strip()]
    payload = DocumentCreate(titre=titre, description=description, tags=tag_list)
    doc = await document_service.create_document(db, payload, file, current_user.id)
    await activity_service.log_action(
        db, current_user.id, activity_service.ACTION_UPLOAD,
        doc.id, f"Fichier : {doc.titre}", _client_ip(request),
    )
    return doc


# ── Listing ───────────────────────────────────────────────────────────────────

@router.get("/", response_model=DocumentList)
async def list_documents(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    docs, total = await document_service.list_documents(
        db, current_user.id, skip, limit, is_admin=_is_admin(current_user)
    )
    return DocumentList(items=docs, total=total, skip=skip, limit=limit)


# ── Corbeille ─────────────────────────────────────────────────────────────────
# IMPORTANT : déclarées AVANT /{doc_id}

@router.get("/trash", response_model=DocumentList)
async def list_trash(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    docs, total = await document_service.list_trash(
        db, current_user.id, skip, limit, is_admin=_is_admin(current_user)
    )
    return DocumentList(items=docs, total=total, skip=skip, limit=limit)


@router.delete("/trash", status_code=200)
async def empty_trash(
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    count = await document_service.empty_trash(
        db, current_user.id, is_admin=_is_admin(current_user)
    )
    await activity_service.log_action(
        db, current_user.id, activity_service.ACTION_DELETE,
        None, f"Corbeille vidée : {count} document(s) supprimé(s)", _client_ip(request),
    )
    return {"count": count}


# ── Documents partagés avec moi ───────────────────────────────────────────────
# IMPORTANT : déclarée AVANT /{doc_id}

@router.get("/shared-with-me", response_model=SharedDocumentList)
async def list_shared_with_me(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Liste les documents partagés avec l'utilisateur connecté."""
    items, total = await share_service.list_shared_with_me(db, current_user.id, skip, limit)

    result = []
    for item in items:
        doc = item["document"]
        result.append(SharedDocumentResponse(
            id=doc.id,
            titre=doc.titre,
            description=doc.description,
            type_fichier=doc.type_fichier,
            taille_fichier=doc.taille_fichier,
            uploaded_par_id=doc.uploaded_par_id,
            date_upload=doc.date_upload,
            date_modification=doc.date_modification,
            est_archive=doc.est_archive,
            tags=doc.tags,
            share_id=item["share_id"],
            shared_by_nom=item["shared_by_nom"],
            permission=item["permission"],
            date_partage=item["date_partage"],
        ))

    return SharedDocumentList(items=result, total=total, skip=skip, limit=limit)


# ── Détail ────────────────────────────────────────────────────────────────────

@router.get("/{doc_id}", response_model=DocumentResponse)
async def get_document(
    doc_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    doc = await document_service.get_document(
        db, doc_id, current_user.id, _is_admin(current_user)
    )
    if doc is None:
        raise HTTPException(status_code=404, detail="Document non trouvé")
    return doc


# ── Mise à jour ────────────────────────────────────────────────────────────────

@router.put("/{doc_id}", response_model=DocumentResponse)
async def update_document(
    doc_id: int,
    payload: DocumentUpdate,
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    doc = await document_service.update_document(
        db, doc_id, payload, current_user.id, _is_admin(current_user)
    )
    if doc is None:
        raise HTTPException(status_code=404, detail="Document non trouvé")

    await activity_service.log_action(
        db, current_user.id, activity_service.ACTION_MODIFY,
        doc.id, f"Modification : {doc.titre}", _client_ip(request),
    )

    # Notifier les utilisateurs avec qui le document est partagé
    shares = await share_service.get_all_shares_for_doc(db, doc.id)
    for s in shares:
        if s.shared_with_id != current_user.id:
            await notification_service.create_notification(
                db,
                user_id=s.shared_with_id,
                type=notification_service.NOTIF_MODIFY,
                titre="Document modifié",
                message=f"« {doc.titre} » a été modifié par {current_user.nom_complet}",
                document_id=doc.id,
            )

    return doc


# ── Archivage logique ──────────────────────────────────────────────────────────

@router.delete("/{doc_id}", status_code=204)
async def archive_document(
    doc_id: int,
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    doc = await document_service.archive_document(
        db, doc_id, current_user.id, _is_admin(current_user)
    )
    if doc is None:
        raise HTTPException(status_code=404, detail="Document non trouvé")
    await activity_service.log_action(
        db, current_user.id, activity_service.ACTION_DELETE,
        doc_id, f"Archivé : {doc.titre}", _client_ip(request),
    )


# ── Restauration ──────────────────────────────────────────────────────────────

@router.put("/{doc_id}/restore", response_model=DocumentResponse)
async def restore_document(
    doc_id: int,
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    doc = await document_service.restore_document(
        db, doc_id, current_user.id, _is_admin(current_user)
    )
    if doc is None:
        raise HTTPException(status_code=404, detail="Document non trouvé dans la corbeille")
    await activity_service.log_action(
        db, current_user.id, activity_service.ACTION_RESTORE,
        doc.id, f"Restauré : {doc.titre}", _client_ip(request),
    )
    return doc


# ── Suppression définitive ────────────────────────────────────────────────────

@router.delete("/{doc_id}/permanent", status_code=204)
async def delete_permanently(
    doc_id: int,
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    if not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="Réservé aux administrateurs")

    # Récupérer les infos avant suppression
    doc = await document_service.get_document(db, doc_id, current_user.id, is_admin=True)
    titre = doc.titre if doc else f"#{doc_id}"
    owner_id = doc.uploaded_par_id if doc else None

    deleted = await document_service.delete_permanently(db, doc_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Document non trouvé")

    await activity_service.log_action(
        db, current_user.id, activity_service.ACTION_DELETE,
        None, f"Suppression définitive : {titre}", _client_ip(request),
    )

    # Notifier le propriétaire si l'admin supprime le document d'un autre utilisateur
    if owner_id and owner_id != current_user.id:
        await notification_service.create_notification(
            db,
            user_id=owner_id,
            type=notification_service.NOTIF_DELETE,
            titre="Document supprimé par un administrateur",
            message=f"« {titre} » a été supprimé définitivement par un administrateur",
            document_id=None,
        )


# ── Téléchargement ────────────────────────────────────────────────────────────

@router.get("/{doc_id}/download")
async def download_document(
    doc_id: int,
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    doc = await document_service.get_document(
        db, doc_id, current_user.id, _is_admin(current_user)
    )
    if doc is None:
        raise HTTPException(status_code=404, detail="Document non trouvé")
    if not os.path.exists(doc.chemin_stockage):
        raise HTTPException(status_code=404, detail="Fichier introuvable sur le serveur")

    await activity_service.log_action(
        db, current_user.id, activity_service.ACTION_DOWNLOAD,
        doc.id, f"Téléchargement : {doc.titre}", _client_ip(request),
    )

    ext = doc.chemin_stockage.rsplit(".", 1)[-1] if "." in doc.chemin_stockage else ""
    display_name = f"{doc.titre}.{ext}" if ext else doc.titre
    return _file_response(doc.chemin_stockage, display_name)


# ── Aperçu inline ─────────────────────────────────────────────────────────────

@router.get("/{doc_id}/preview")
async def preview_document(
    doc_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    doc = await document_service.get_document(
        db, doc_id, current_user.id, _is_admin(current_user)
    )
    if doc is None:
        raise HTTPException(status_code=404, detail="Document non trouvé")
    if not os.path.exists(doc.chemin_stockage):
        raise HTTPException(status_code=404, detail="Fichier introuvable sur le serveur")

    mime = (doc.type_fichier or "").lower()

    if "pdf" in mime:
        return FileResponse(
            path=doc.chemin_stockage,
            media_type="application/pdf",
            headers={"Content-Disposition": "inline"},
        )
    if mime.startswith("image/"):
        return FileResponse(
            path=doc.chemin_stockage,
            media_type=mime,
            headers={"Content-Disposition": "inline"},
        )
    if mime.startswith("text/") or mime in ("application/json", "application/csv"):
        async with aiofiles.open(doc.chemin_stockage, "r", encoding="utf-8", errors="replace") as f:
            content = await f.read()
        return PlainTextResponse(content)

    raise HTTPException(
        status_code=415,
        detail="Aperçu non disponible pour ce format. Téléchargez le fichier pour le consulter.",
    )


# ── Remplacement de fichier ───────────────────────────────────────────────────

@router.put("/{doc_id}/replace", response_model=DocumentResponse)
async def replace_document_file(
    doc_id: int,
    request: Request,
    commentaire: str = Form(""),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    doc = await document_service.replace_file(
        db, doc_id, file, current_user.id, commentaire, _is_admin(current_user)
    )
    if doc is None:
        raise HTTPException(status_code=404, detail="Document non trouvé")

    await activity_service.log_action(
        db, current_user.id, activity_service.ACTION_MODIFY,
        doc.id, f"Fichier remplacé : {doc.titre}", _client_ip(request),
    )

    # Notifier les utilisateurs avec qui le document est partagé
    shares = await share_service.get_all_shares_for_doc(db, doc.id)
    for s in shares:
        if s.shared_with_id != current_user.id:
            await notification_service.create_notification(
                db,
                user_id=s.shared_with_id,
                type=notification_service.NOTIF_MODIFY,
                titre="Fichier mis à jour",
                message=f"Le fichier « {doc.titre} » a été remplacé par {current_user.nom_complet}",
                document_id=doc.id,
            )

    return doc


# ── Versions ──────────────────────────────────────────────────────────────────

@router.get("/{doc_id}/versions", response_model=list[DocumentVersionResponse])
async def list_versions(
    doc_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    versions = await document_service.get_versions(
        db, doc_id, current_user.id, _is_admin(current_user)
    )
    if versions is None:
        raise HTTPException(status_code=404, detail="Document non trouvé")
    return versions


@router.get("/{doc_id}/versions/{version_id}/download")
async def download_version(
    doc_id: int,
    version_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    version = await document_service.get_version(
        db, doc_id, version_id, current_user.id, _is_admin(current_user)
    )
    if version is None:
        raise HTTPException(status_code=404, detail="Version non trouvée")
    if not os.path.exists(version.chemin_fichier):
        raise HTTPException(status_code=404, detail="Fichier de version introuvable")

    ext = version.chemin_fichier.rsplit(".", 1)[-1] if "." in version.chemin_fichier else ""
    display_name = f"version_{version.numero_version}.{ext}" if ext else f"version_{version.numero_version}"
    return _file_response(version.chemin_fichier, display_name)


# ── Partage de documents ──────────────────────────────────────────────────────

@router.post("/{doc_id}/share", response_model=ShareOut, status_code=201)
async def share_document(
    doc_id: int,
    payload: ShareCreate,
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Partage un document. Seul le propriétaire ou un admin peut partager."""
    # Vérifier l'existence du document et les droits (propriétaire ou admin)
    doc = await document_service.get_document(db, doc_id, current_user.id, _is_admin(current_user))
    if doc is None:
        raise HTTPException(status_code=404, detail="Document non trouvé")

    # Seul le propriétaire ou un admin peut partager
    if not _is_admin(current_user) and doc.uploaded_par_id != current_user.id:
        raise HTTPException(status_code=403, detail="Seul le propriétaire ou un admin peut partager ce document")

    # Ne pas partager avec soi-même
    if payload.user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas partager un document avec vous-même")

    if payload.permission not in ("lecture", "modification"):
        raise HTTPException(status_code=400, detail="Permission invalide (lecture ou modification)")

    share = await share_service.share_document(
        db,
        doc_id=doc_id,
        shared_by_id=current_user.id,
        shared_with_id=payload.user_id,
        permission=payload.permission,
    )

    await activity_service.log_action(
        db, current_user.id, activity_service.ACTION_SHARE,
        doc_id, f"Partagé avec user#{payload.user_id} ({payload.permission})", _client_ip(request),
    )

    # Notification pour le destinataire
    perm_label = "modification" if payload.permission == "modification" else "lecture seule"
    await notification_service.create_notification(
        db,
        user_id=payload.user_id,
        type=notification_service.NOTIF_SHARE,
        titre="Document partagé avec vous",
        message=f"« {doc.titre} » a été partagé avec vous par {current_user.nom_complet} ({perm_label})",
        document_id=doc_id,
    )

    return ShareOut(
        id=share.id,
        document_id=share.document_id,
        shared_by_id=share.shared_by_id,
        shared_by_nom=current_user.nom_complet,
        shared_with_id=share.shared_with_id,
        permission=share.permission,
        date_partage=share.date_partage,
    )


@router.get("/{doc_id}/shares", response_model=list[ShareOut])
async def list_shares(
    doc_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Liste les partages d'un document. Propriétaire ou admin uniquement."""
    doc = await document_service.get_document(db, doc_id, current_user.id, _is_admin(current_user))
    if doc is None:
        raise HTTPException(status_code=404, detail="Document non trouvé")

    if not _is_admin(current_user) and doc.uploaded_par_id != current_user.id:
        raise HTTPException(status_code=403, detail="Accès non autorisé")

    shares = await share_service.get_shares_for_document(db, doc_id)
    return [ShareOut(**s) for s in shares]


@router.delete("/{doc_id}/shares/{share_id}", status_code=204)
async def revoke_share(
    doc_id: int,
    share_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Révoque un partage. Propriétaire ou admin uniquement."""
    doc = await document_service.get_document(db, doc_id, current_user.id, _is_admin(current_user))
    if doc is None:
        raise HTTPException(status_code=404, detail="Document non trouvé")

    if not _is_admin(current_user) and doc.uploaded_par_id != current_user.id:
        raise HTTPException(status_code=403, detail="Accès non autorisé")

    ok = await share_service.revoke_share(db, share_id, doc_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Partage non trouvé")
