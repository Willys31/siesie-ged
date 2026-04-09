from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field

from models.user import UserRole


# ── Inscription ──────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    email: EmailStr
    nom_complet: str = Field(..., min_length=2, max_length=100)
    mot_de_passe: str = Field(..., min_length=8, description="Minimum 8 caractères")
    role: UserRole = UserRole.utilisateur


# ── Connexion ─────────────────────────────────────────────────────────────────

class UserLogin(BaseModel):
    email: EmailStr
    mot_de_passe: str


# ── Réponse utilisateur ───────────────────────────────────────────────────────

class UserResponse(BaseModel):
    id: int
    email: EmailStr
    nom_complet: str
    role: UserRole
    date_creation: datetime
    est_actif: bool
    avatar_path: Optional[str] = None

    model_config = {"from_attributes": True}


# ── Mise à jour profil ────────────────────────────────────────────────────────

class UserUpdateProfile(BaseModel):
    nom_complet: Optional[str] = Field(None, min_length=2, max_length=100)
    email: Optional[EmailStr] = None


class UserChangePassword(BaseModel):
    ancien_mot_de_passe: str
    nouveau_mot_de_passe: str = Field(..., min_length=8)
    confirmation: str


# ── Administration ────────────────────────────────────────────────────────────

class UserRoleUpdate(BaseModel):
    role: UserRole


# ── Recherche utilisateurs (partage) ─────────────────────────────────────────

class UserBasicInfo(BaseModel):
    id:          int
    nom_complet: str
    email:       EmailStr
    avatar_path: Optional[str] = None

    model_config = {"from_attributes": True}


# ── Tokens ────────────────────────────────────────────────────────────────────

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int = Field(..., description="Durée de vie de l'access_token en secondes")


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class TokenData(BaseModel):
    """Données extraites d'un JWT décodé (usage interne)."""
    email: Optional[str] = None
    token_type: str = "access"  # "access" | "refresh"
