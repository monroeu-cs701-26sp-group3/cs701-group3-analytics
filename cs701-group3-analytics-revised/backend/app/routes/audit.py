"""
Audit Log routes.
SystemAdmin and ComplianceOfficer only.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import Optional
from app.database import get_db
from app.models.models import AuditLog
from app.utils.auth import require_roles
from app.models.models import User

router = APIRouter()

ALLOWED = ("SystemAdmin", "ComplianceOfficer")


@router.get("/")
def list_audit_logs(
    skip:   int = Query(default=0, ge=0),
    limit:  int = Query(default=50, ge=1, le=200),
    action: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*ALLOWED)),
):
    """Return audit log entries with optional action/status filters."""
    query = db.query(AuditLog).order_by(desc(AuditLog.logged_at))

    if action:
        query = query.filter(AuditLog.action.ilike(f"%{action}%"))
    if status:
        query = query.filter(AuditLog.status == status)

    total = query.count()
    logs  = query.offset(skip).limit(limit).all()

    return {
        "total": total,
        "data": [
            {
                "log_id":     l.log_id,
                "user_id":    l.user_id,
                "action":     l.action,
                "resource":   l.resource,
                "ip_address": str(l.ip_address) if l.ip_address else None,
                "status":     l.status,
                "details":    l.details,
                "logged_at":  str(l.logged_at),
            }
            for l in logs
        ],
    }
