"""
Router /api/activity-logs

GET  /        — liste des logs avec filtres (admin : tous, user : les siens)
GET  /me      — alias explicite pour les logs de l'utilisateur connecté
"""

from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from config.database import get_db
from models.user import User, UserRole
from schemas.activity_log import ActivityLogList
from services import activity_service
from services.auth import get_current_active_user

router = APIRouter()


def _is_admin(user: User) -> bool:
    return user.role == UserRole.admin


@router.get("/", response_model=ActivityLogList)
async def list_activity_logs(
    skip:         int            = Query(0, ge=0),
    limit:        int            = Query(50, ge=1, le=200),
    action:       Optional[str]  = Query(None, description="Filtrer par type d'action"),
    user_id:      Optional[int]  = Query(None, description="Filtrer par utilisateur (admin seulement)"),
    date_debut:   Optional[str]  = Query(None, description="Date de début ISO (YYYY-MM-DD)"),
    date_fin:     Optional[str]  = Query(None, description="Date de fin ISO (YYYY-MM-DD)"),
    current_user: User           = Depends(get_current_active_user),
    db:           AsyncSession   = Depends(get_db),
):
    """
    Liste les entrées du journal d'activité.
    - Admin : peut voir tous les logs et filtrer par utilisateur.
    - Utilisateur : voit uniquement ses propres logs.
    """
    target_user = user_id if _is_admin(current_user) else None

    items, total = await activity_service.list_logs(
        db,
        current_user_id=current_user.id,
        is_admin=_is_admin(current_user),
        skip=skip,
        limit=limit,
        action=action,
        target_user_id=target_user,
        date_debut=date_debut,
        date_fin=date_fin,
    )
    return ActivityLogList(items=items, total=total, skip=skip, limit=limit)


@router.get("/me", response_model=ActivityLogList)
async def list_my_activity_logs(
    skip:         int            = Query(0, ge=0),
    limit:        int            = Query(50, ge=1, le=200),
    action:       Optional[str]  = Query(None),
    date_debut:   Optional[str]  = Query(None),
    date_fin:     Optional[str]  = Query(None),
    current_user: User           = Depends(get_current_active_user),
    db:           AsyncSession   = Depends(get_db),
):
    """Logs de l'utilisateur connecté uniquement."""
    items, total = await activity_service.list_logs(
        db,
        current_user_id=current_user.id,
        is_admin=False,   # force filtre sur user courant
        skip=skip,
        limit=limit,
        action=action,
        date_debut=date_debut,
        date_fin=date_fin,
    )
    return ActivityLogList(items=items, total=total, skip=skip, limit=limit)
