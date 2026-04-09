"""
Router /api/admin

Routes (admin uniquement) :
  GET    /users                          — liste tous les utilisateurs
  PUT    /users/{id}/role                — changer le rôle d'un utilisateur
  PUT    /users/{id}/toggle-active       — activer / désactiver un compte
  GET    /documents                      — liste tous les documents (tous utilisateurs)

Accès : JWT valide + rôle admin (dépendance require_admin).
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config.database import get_db
from models.user import User
from schemas.auth import UserResponse, UserRoleUpdate
from schemas.document import DocumentList
from services.auth import require_admin
from services import document_service

router = APIRouter()


# ── Utilisateurs ──────────────────────────────────────────────────────────────

@router.get("/users", response_model=list[UserResponse])
async def list_all_users(
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Retourne tous les utilisateurs, tous rôles confondus."""
    result = await db.execute(select(User).order_by(User.date_creation.asc()))
    return result.scalars().all()


@router.put("/users/{user_id}/role", response_model=UserResponse)
async def update_user_role(
    user_id: int,
    payload: UserRoleUpdate,
    current_admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Change le rôle d'un utilisateur (admin ↔ utilisateur)."""
    if user_id == current_admin.id:
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas modifier votre propre rôle")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")

    user.role = payload.role
    await db.commit()
    await db.refresh(user)
    return user


@router.put("/users/{user_id}/toggle-active", response_model=UserResponse)
async def toggle_user_active(
    user_id: int,
    current_admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Active ou désactive le compte d'un utilisateur."""
    if user_id == current_admin.id:
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas désactiver votre propre compte")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")

    user.est_actif = not user.est_actif
    await db.commit()
    await db.refresh(user)
    return user


# ── Documents ─────────────────────────────────────────────────────────────────

@router.get("/documents", response_model=DocumentList)
async def list_all_documents(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Retourne tous les documents de tous les utilisateurs (non archivés)."""
    docs, total = await document_service.list_documents(
        db, admin.id, skip, limit, is_admin=True
    )
    return DocumentList(items=docs, total=total, skip=skip, limit=limit)
