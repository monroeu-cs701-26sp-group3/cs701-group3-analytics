"""
Customer Segmentation routes.
DataAnalyst / SystemAdmin only.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from app.database import get_db
from app.models.models import Segment, Customer, AuditLog
from app.utils.auth import require_roles
from app.models.models import User

router = APIRouter()

ALLOWED = ("DataAnalyst", "SystemAdmin")


@router.get("/summary")
def segment_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*ALLOWED)),
):
    """Return count and average score per segment label."""
    results = (
        db.query(
            Segment.segment_label,
            func.count(Segment.segment_id).label("count"),
            func.avg(Segment.score).label("avg_score"),
        )
        .group_by(Segment.segment_label)
        .order_by(desc("count"))
        .all()
    )

    _log(db, current_user, "VIEW_SEGMENT_SUMMARY", "/api/segments/summary")

    return [
        {
            "segment":   r.segment_label,
            "count":     r.count,
            "avg_score": round(float(r.avg_score or 0), 2),
        }
        for r in results
    ]


@router.get("/")
def list_segments(
    label: str = Query(default=None),
    skip:  int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*ALLOWED)),
):
    """List segment assignments, optionally filtered by label."""
    query = db.query(Segment)
    if label:
        query = query.filter(Segment.segment_label == label)

    total    = query.count()
    segments = query.offset(skip).limit(limit).all()

    _log(db, current_user, "LIST_SEGMENTS", "/api/segments/")

    return {
        "total": total,
        "data": [
            {
                "segment_id":    s.segment_id,
                "customer_id":   s.customer_id,
                "segment_label": s.segment_label,
                "score":         float(s.score or 0),
                "assigned_at":   str(s.assigned_at),
                "method":        s.method,
            }
            for s in segments
        ],
    }


def _log(db: Session, user: User, action: str, resource: str):
    db.add(AuditLog(user_id=user.user_id, action=action, resource=resource))
    db.commit()
