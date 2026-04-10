import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

import models  # enregistre tous les modèles dans Base.metadata avant create_all
from config.database import Base, engine
from config.settings import settings
from routers import activity_logs, admin, auth, documents, notifications, search, users


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Crée les tables manquantes au démarrage (pratique en dev)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


app = FastAPI(
    title="SieSie - Gestion Électronique de Documents",
    description="API pour la gestion électronique de documents",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Fichiers statiques (avatars) ──────────────────────────────────────────────
avatar_dir = os.path.join(settings.UPLOAD_DIR, "avatars")
os.makedirs(avatar_dir, exist_ok=True)
app.mount("/avatars", StaticFiles(directory=avatar_dir), name="avatars")

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth.router,           prefix="/api/auth",           tags=["Authentification"])
app.include_router(documents.router,      prefix="/api/documents",      tags=["Documents"])
app.include_router(search.router,         prefix="/api/search",         tags=["Recherche"])
app.include_router(users.router,          prefix="/api/users",          tags=["Utilisateurs"])
app.include_router(admin.router,          prefix="/api/admin",          tags=["Administration"])
app.include_router(activity_logs.router,  prefix="/api/activity-logs",  tags=["Journal d'activité"])
app.include_router(notifications.router,  prefix="/api/notifications",  tags=["Notifications"])


@app.get("/health", tags=["Système"])
async def health_check():
    return {"status": "ok", "version": "1.0.0"}


# ── Setup temporaire ──────────────────────────────────────────────────────────
@app.get("/api/setup/make-admin/{email}", tags=["Setup"])
async def make_admin(email: str):
    from sqlalchemy import func, select
    from config.database import AsyncSessionLocal
    from models.user import User, UserRole

    async with AsyncSessionLocal() as db:
        total = (await db.execute(select(func.count(User.id)))).scalar()
        if total != 1:
            from fastapi import HTTPException
            raise HTTPException(status_code=403, detail="Interdit : il faut exactement 1 utilisateur en base.")

        user = (await db.execute(select(User).where(User.email == email))).scalar_one_or_none()
        if not user:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Utilisateur introuvable.")

        user.role = UserRole.admin
        await db.commit()

    return {"status": "OK", "email": email, "role": "admin"}
