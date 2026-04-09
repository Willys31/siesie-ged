"""
Router /api/users

Routes :
  GET    /me               — profil complet
  PUT    /me               — modifier nom, email
  PUT    /me/password      — changer le mot de passe
  POST   /me/avatar        — upload photo de profil
  GET    /me/stats         — statistiques personnelles

Accès : utilisateur connecté et actif (JWT requis).
"""

import os
import uuid

import aiofiles
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config.database import get_db
from config.settings import settings
from models.user import User
from schemas.auth import UserBasicInfo, UserChangePassword, UserResponse, UserUpdateProfile
from services.auth import get_current_active_user, hash_password, verify_password
from services.document_service import get_user_stats

router = APIRouter()


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_active_user)):
    return current_user


@router.put("/me", response_model=UserResponse)
async def update_me(
    updates: UserUpdateProfile,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    data = updates.model_dump(exclude_unset=True)

    if "email" in data and data["email"] != current_user.email:
        result = await db.execute(select(User).where(User.email == data["email"]))
        if result.scalar_one_or_none() is not None:
            raise HTTPException(status_code=409, detail="Cet email est déjà utilisé")

    for field, value in data.items():
        setattr(current_user, field, value)
    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.put("/me/password", status_code=204)
async def change_password(
    payload: UserChangePassword,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    if not verify_password(payload.ancien_mot_de_passe, current_user.mot_de_passe_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mot de passe actuel incorrect",
        )
    if payload.nouveau_mot_de_passe != payload.confirmation:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La confirmation ne correspond pas au nouveau mot de passe",
        )
    current_user.mot_de_passe_hash = hash_password(payload.nouveau_mot_de_passe)
    await db.commit()


@router.post("/me/avatar", response_model=UserResponse)
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Seules les images sont acceptées (PNG, JPG, WebP…)",
        )

    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Image trop volumineuse (max 5 Mo)",
        )

    ext = "jpg"
    if file.filename and "." in file.filename:
        ext = file.filename.rsplit(".", 1)[-1].lower()

    avatar_dir = os.path.join(settings.UPLOAD_DIR, "avatars")
    os.makedirs(avatar_dir, exist_ok=True)

    filename = f"{uuid.uuid4()}.{ext}"
    path = os.path.join(avatar_dir, filename)

    async with aiofiles.open(path, "wb") as f:
        await f.write(content)

    current_user.avatar_path = filename
    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.get("/me/stats")
async def get_my_stats(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_user_stats(db, current_user.id)


# ── Recherche utilisateurs (pour le partage) ──────────────────────────────────

@router.get("/search", response_model=list[UserBasicInfo])
async def search_users(
    q: str = Query("", min_length=1, max_length=100, description="Nom ou email"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Recherche des utilisateurs actifs par nom ou email (excluant l'utilisateur connecté).
    Utilisé principalement pour le modal de partage.
    """
    from sqlalchemy import or_
    result = await db.execute(
        select(User)
        .where(
            User.est_actif == True,  # noqa: E712
            User.id != current_user.id,
            or_(
                User.nom_complet.ilike(f"%{q}%"),
                User.email.ilike(f"%{q}%"),
            ),
        )
        .order_by(User.nom_complet)
        .limit(10)
    )
    return list(result.scalars().all())
