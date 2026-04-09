"""
Service de journalisation des activités.

log_action  — enregistre une entrée dans activity_logs (same-transaction)
list_logs   — liste les logs avec filtres et pagination
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.activity_log import ActivityLog
from models.document import Document
from models.user import User


# Actions supportées (valeurs stockées en base)
ACTION_UPLOAD   = "upload"
ACTION_DOWNLOAD = "download"
ACTION_MODIFY   = "modify"
ACTION_DELETE   = "delete"
ACTION_RESTORE  = "restore"
ACTION_LOGIN    = "login"
ACTION_SHARE    = "share"


async def log_action(
    db:          AsyncSession,
    user_id:     int,
    action:      str,
    document_id: Optional[int] = None,
    details:     Optional[str] = None,
    adresse_ip:  Optional[str] = None,
) -> None:
    """
    Enregistre une action dans le journal.
    L'entrée est persistée dans la même transaction que l'opération principale.
    Silencieux en cas d'erreur (ne fait pas échouer l'opération principale).
    """
    try:
        entry = ActivityLog(
            user_id=user_id,
            action=action,
            document_id=document_id,
            details=details,
            adresse_ip=adresse_ip,
        )
        db.add(entry)
    except Exception:
        pass  # best-effort


async def list_logs(
    db:             AsyncSession,
    current_user_id: int,
    is_admin:       bool,
    skip:           int = 0,
    limit:          int = 50,
    action:         Optional[str] = None,
    target_user_id: Optional[int] = None,
    date_debut:     Optional[str] = None,
    date_fin:       Optional[str] = None,
) -> tuple[list[dict], int]:
    """
    Retourne (items, total).
    Admin voit tous les logs ; utilisateur voit uniquement les siens.
    """
    # Sous-requête de base avec jointures
    base_q = (
        select(
            ActivityLog,
            User.nom_complet.label("user_nom"),
            Document.titre.label("document_titre"),
        )
        .join(User, ActivityLog.user_id == User.id)
        .outerjoin(Document, ActivityLog.document_id == Document.id)
    )

    # Filtres d'accès
    if not is_admin:
        base_q = base_q.where(ActivityLog.user_id == current_user_id)
    elif target_user_id:
        base_q = base_q.where(ActivityLog.user_id == target_user_id)

    # Filtres optionnels
    if action:
        base_q = base_q.where(ActivityLog.action == action)

    if date_debut:
        try:
            base_q = base_q.where(ActivityLog.date_action >= datetime.fromisoformat(date_debut))
        except ValueError:
            pass

    if date_fin:
        try:
            end = datetime.fromisoformat(date_fin).replace(hour=23, minute=59, second=59)
            base_q = base_q.where(ActivityLog.date_action <= end)
        except ValueError:
            pass

    # Compte total
    count_result = await db.execute(
        select(func.count()).select_from(base_q.subquery())
    )
    total: int = count_result.scalar_one()

    # Résultats paginés
    result = await db.execute(
        base_q
        .order_by(ActivityLog.date_action.desc())
        .offset(skip)
        .limit(limit)
    )
    rows = result.all()

    items = []
    for row in rows:
        log, user_nom, document_titre = row
        items.append({
            "id":             log.id,
            "user_id":        log.user_id,
            "user_nom":       user_nom,
            "action":         log.action,
            "document_id":    log.document_id,
            "document_titre": document_titre,
            "details":        log.details,
            "adresse_ip":     log.adresse_ip,
            "date_action":    log.date_action,
        })

    return items, total
