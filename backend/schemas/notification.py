from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class NotificationOut(BaseModel):
    id:            int
    user_id:       int
    type:          str
    titre:         str
    message:       str
    document_id:   Optional[int] = None
    est_lue:       bool
    date_creation: datetime

    model_config = {"from_attributes": True}


class NotificationList(BaseModel):
    items:        List[NotificationOut]
    total:        int
    unread_count: int
    skip:         int
    limit:        int


class UnreadCount(BaseModel):
    count: int
