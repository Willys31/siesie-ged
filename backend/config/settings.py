from typing import List, Optional

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "SieSie"
    DEBUG: bool = False
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Base de données — driver asyncpg pour le runtime
    DATABASE_URL: str = "postgresql+asyncpg://ged_user:ged_password@localhost:5432/ged_db"
    # URL synchrone utilisée uniquement par Alembic (migrations)
    DATABASE_URL_SYNC: str = "postgresql://ged_user:ged_password@localhost:5432/ged_db"

    # Elasticsearch — optionnel : si absent, la recherche utilise PostgreSQL FTS
    ELASTICSEARCH_URL: Optional[str] = None
    ES_INDEX_DOCUMENTS: str = "documents"

    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:5173"]
    # URL du frontend en production (ex: https://siesie-frontend.onrender.com)
    FRONTEND_URL: Optional[str] = None

    # Upload
    UPLOAD_DIR: str = "uploads"
    MAX_FILE_SIZE: int = 50 * 1024 * 1024  # 50 MB
    ALLOWED_EXTENSIONS: List[str] = [
        "pdf", "docx", "doc", "xlsx", "xls", "png", "jpg", "jpeg",
    ]

    class Config:
        env_file = ".env"


settings = Settings()
