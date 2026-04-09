"""
Service de gestion des notifications.

create_notification — crée une notification (best-effort, same-transaction)
list_notifications  — liste paginée des notifications d'un utilisateur
get_unread_count    — nombre de notifications non lues
mark_as_read        — marquer une notification comme lue
mark_all_read       — marquer toutes les notifications comme lues
"""

from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.notification import Notification

# Types de notification
NOTIF_SHARE   = "share"
NOTIF_MODIFY  = "modify"
NOTIF_DELETE  = "delete"
NOTIF_RESTORE = "restore"
NOTIF_SYSTEM  = "system"


async def create_notification(
    db:          AsyncSession,
    user_id:     int,
    type:        str,
    titre:       str,
    message:     str,
    document_id: Optional[int] = None,
) -> None:
    """
    Crée une notification dans la même transaction que l'opération principale.
    Silencieux en cas d'erreur.
    """
    try:
        notif = Notification(
            user_id=user_id,
            type=type,
            titre=titre,
            message=message,
            document_id=document_id,
        )
        db.add(notif)
    except Exception:
        pass  # best-effort


async def list_notifications(
    db:      AsyncSession,
    user_id: int,
    skip:    int = 0,
    limit:   int = 20,
) -> tuple[list[Notification], int, int]:
    """Retourne (items, total, unread_count)."""
    base_q = select(Notification).where(Notification.user_id == user_id)

    count_result = await db.execute(
        select(func.count()).select_from(base_q.subquery())
    )
    total: int = count_result.scalar_one()

    unread_result = await db.execute(
        select(func.count()).where(
            Notification.user_id == user_id,
            Notification.est_lue == False,  # noqa: E712
        )
    )
    unread_count: int = unread_result.scalar_one()

    result = await db.execute(
        base_q
        .order_by(Notification.date_creation.desc())
        .offset(skip)
        .limit(limit)
    )
    return list(result.scalars().all()), total, unread_count


async def get_unread_count(db: AsyncSession, user_id: int) -> int:
    result = await db.execute(
        select(func.count()).where(
            Notification.user_id == user_id,
            Notification.est_lue == False,  # noqa: E712
        )
    )
    return result.scalar_one()


async def mark_as_read(db: AsyncSession, notif_id: int, user_id: int) -> bool:
    result = await db.execute(
        select(Notification).where(
            Notification.id == notif_id,
            Notification.user_id == user_id,
        )
    )
    notif = result.scalar_one_or_none()
    if notif is None:
        return False
    notif.est_lue = True
    await db.flush()
    return True


async def mark_all_read(db: AsyncSession, user_id: int) -> int:
    """Marque toutes les notifications non lues comme lues. Retourne le nombre mis à jour."""
    result = await db.execute(
        select(Notification).where(
            Notification.user_id == user_id,
            Notification.est_lue == False,  # noqa: E712
        )
    )
    notifs = list(result.scalars().all())
    for n in notifs:
        n.est_lue = True
    if notifs:
        await db.flush()
    return len(notifs)
