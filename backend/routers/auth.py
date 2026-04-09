from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config.database import get_db
from config.settings import settings
from models.user import User
from schemas.auth import RefreshTokenRequest, Token, UserCreate, UserLogin, UserResponse
from services import activity_service
from services.auth import (
    authenticate_user,
    create_access_token,
    create_refresh_token,
    decode_token,
    get_current_active_user,
    hash_password,
)

router = APIRouter()


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Inscription d'un nouvel utilisateur",
)
async def register(payload: UserCreate, db: AsyncSession = Depends(get_db)):
    # Vérifie l'unicité de l'email
    result = await db.execute(select(User).where(User.email == payload.email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Un compte existe déjà avec cet email",
        )

    user = User(
        email=payload.email,
        nom_complet=payload.nom_complet,
        mot_de_passe_hash=hash_password(payload.mot_de_passe),
        role=payload.role,
    )
    db.add(user)
    # flush : attribue l'id en base sans committer
    # (le commit est fait automatiquement par get_db en fin de requête)
    await db.flush()
    await db.refresh(user)
    return user


@router.post(
    "/login",
    response_model=Token,
    summary="Connexion — retourne access_token + refresh_token",
)
async def login(request: Request, payload: UserLogin, db: AsyncSession = Depends(get_db)):
    user = await authenticate_user(db, payload.email, payload.mot_de_passe)
    if not user:
        # Message volontairement générique pour ne pas révéler si l'email existe
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.est_actif:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Compte désactivé, contactez un administrateur",
        )

    ip = request.client.host if request.client else None
    await activity_service.log_action(db, user.id, activity_service.ACTION_LOGIN, None, "Connexion", ip)

    return Token(
        access_token=create_access_token(user.email),
        refresh_token=create_refresh_token(user.email),
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post(
    "/refresh",
    response_model=Token,
    summary="Renouvelle l'access_token grâce au refresh_token",
)
async def refresh(payload: RefreshTokenRequest, db: AsyncSession = Depends(get_db)):
    try:
        token_data = decode_token(payload.refresh_token, expected_type="refresh")
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token invalide ou expiré",
            headers={"WWW-Authenticate": "Bearer"},
        )

    result = await db.execute(select(User).where(User.email == token_data.email))
    user = result.scalar_one_or_none()
    if not user or not user.est_actif:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Utilisateur introuvable ou inactif",
        )

    return Token(
        access_token=create_access_token(user.email),
        refresh_token=create_refresh_token(user.email),
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Profil de l'utilisateur connecté",
)
async def get_me(current_user: User = Depends(get_current_active_user)):
    return current_user
