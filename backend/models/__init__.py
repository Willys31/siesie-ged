# Ordre d'import important :
# 1. associations (table d'association, pas de FK vers les modèles)
# 2. modèles sans dépendances inter-modèles
# 3. modèles avec FK vers d'autres modèles
from models.associations import document_tags  # noqa: F401
from models.user import User, UserRole
from models.tag import Tag
from models.document import Document
from models.document_version import DocumentVersion
from models.permission import Permission
from models.activity_log import ActivityLog
from models.notification import Notification
from models.document_share import DocumentShare

__all__ = [
    "document_tags",
    "User",
    "UserRole",
    "Document",
    "DocumentVersion",
    "Tag",
    "Permission",
    "ActivityLog",
    "Notification",
    "DocumentShare",
]
