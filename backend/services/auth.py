from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config.database import get_db
from config.settings import settings
from models.user import User, UserRole
from schemas.auth import TokenData

# ── Crypto ────────────────────────────────────────────────────────────────────

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# tokenUrl sert uniquement à Swagger UI pour localiser l'endpoint de connexion
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


# ── JWT ───────────────────────────────────────────────────────────────────────

def _build_token(email: str, token_type: str, expires_delta: timedelta) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": email,
        "type": token_type,
        "iat": now,
        "exp": now + expires_delta,
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_access_token(email: str) -> str:
    return _build_token(
        email,
        "access",
        timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )


def create_refresh_token(email: str) -> str:
    return _build_token(
        email,
        "refresh",
        timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )


def decode_token(token: str, *, expected_type: str = "access") -> TokenData:
    """
    Décode et valide un JWT.
    Lève ValueError si le token est invalide, expiré, ou du mauvais type.
    """
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
    except JWTError as exc:
        raise ValueError(f"JWT invalide : {exc}") from exc

    email: Optional[str] = payload.get("sub")
    token_type: str = payload.get("type", "")

    if not email:
        raise ValueError("Champ 'sub' manquant dans le token")
    if token_type != expected_type:
        raise ValueError(
            f"Type de token incorrect : attendu '{expected_type}', reçu '{token_type}'"
        )

    return TokenData(email=email, token_type=token_type)


# ── Authentification DB ───────────────────────────────────────────────────────

async def authenticate_user(
    db: AsyncSession,
    email: str,
    password: str,
) -> Optional[User]:
    """Vérifie l'email et le mot de passe. Retourne l'utilisateur ou None."""
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if user is None or not verify_password(password, user.mot_de_passe_hash):
        return None
    return user


# ── Dépendances FastAPI ───────────────────────────────────────────────────────

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Dépendance : extrait et valide le Bearer token, retourne l'utilisateur.
    Lève HTTP 401 si le token est absent, invalide ou expiré.
    """
    credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token invalide ou expiré",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        token_data = decode_token(token, expected_type="access")
    except ValueError:
        raise credentials_exc

    result = await db.execute(select(User).where(User.email == token_data.email))
    user = result.scalar_one_or_none()
    if user is None:
        raise credentials_exc
    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Dépendance : comme get_current_user mais vérifie aussi que le compte est actif.
    Lève HTTP 403 si le compte est désactivé.
    """
    if not current_user.est_actif:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Compte désactivé, contactez un administrateur",
        )
    return current_user


async def require_admin(
    current_user: User = Depends(get_current_active_user),
) -> User:
    """
    Dépendance : réserve l'accès aux administrateurs.
    Lève HTTP 403 pour tout autre rôle.
    """
    if current_user.role != UserRole.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Droits administrateur requis",
        )
    return current_user
