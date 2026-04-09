"""
Router /api/notifications

Routes :
  GET  /                  — liste des notifications de l'utilisateur connecté
  GET  /unread-count      — nombre de notifications non lues
  PUT  /read-all          — marquer toutes comme lues
  PUT  /{id}/read         — marquer une notification comme lue

IMPORTANT : routes fixes (unread-count, read-all) déclarées AVANT /{id}.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from config.database import get_db
from models.user import User
from schemas.notification import NotificationList, UnreadCount
from services import notification_service
from services.auth import get_current_active_user

router = APIRouter()


@router.get("/", response_model=NotificationList)
async def list_notifications(
    skip:         int  = Query(0,  ge=0),
    limit:        int  = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db:           AsyncSession = Depends(get_db),
):
    """Liste paginée des notifications de l'utilisateur connecté."""
    items, total, unread_count = await notification_service.list_notifications(
        db, current_user.id, skip, limit
    )
    return NotificationList(
        items=items,
        total=total,
        unread_count=unread_count,
        skip=skip,
        limit=limit,
    )


# ── Routes fixes AVANT /{id} ──────────────────────────────────────────────────

@router.get("/unread-count", response_model=UnreadCount)
async def get_unread_count(
    current_user: User = Depends(get_current_active_user),
    db:           AsyncSession = Depends(get_db),
):
    """Nombre de notifications non lues (utilisé pour le badge de polling)."""
    count = await notification_service.get_unread_count(db, current_user.id)
    return UnreadCount(count=count)


@router.put("/read-all", status_code=200)
async def mark_all_read(
    current_user: User = Depends(get_current_active_user),
    db:           AsyncSession = Depends(get_db),
):
    """Marque toutes les notifications non lues comme lues."""
    count = await notification_service.mark_all_read(db, current_user.id)
    return {"updated": count}


# ── Routes paramétriques ──────────────────────────────────────────────────────

@router.put("/{notif_id}/read", status_code=200)
async def mark_as_read(
    notif_id:     int,
    current_user: User = Depends(get_current_active_user),
    db:           AsyncSession = Depends(get_db),
):
    """Marque une notification spécifique comme lue."""
    ok = await notification_service.mark_as_read(db, notif_id, current_user.id)
    if not ok:
        raise HTTPException(status_code=404, detail="Notification non trouvée")
    return {"ok": True}
