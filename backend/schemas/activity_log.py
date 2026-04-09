from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class ActivityLogOut(BaseModel):
    id:              int
    user_id:         int
    user_nom:        Optional[str] = None
    action:          str
    document_id:     Optional[int] = None
    document_titre:  Optional[str] = None
    details:         Optional[str] = None
    adresse_ip:      Optional[str] = None
    date_action:     datetime


class ActivityLogList(BaseModel):
    items: list[ActivityLogOut]
    total: int
    skip:  int
    limit: int
