"""
KPI Analytics routes — summary stats, trend data, top categories.
Accessible to: DataAnalyst, SystemAdmin
"""

import csv
import io
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import Optional, List
from datetime import date
from app.database import get_db
from app.models.models import KPISnapshot, Transaction, Customer, AuditLog
from app.utils.auth import require_roles, get_current_user
from app.models.models import User

router = APIRouter()

ALLOWED = ("DataAnalyst", "SystemAdmin")


@router.get("/summary")
def get_kpi_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*ALLOWED)),
):
    """Return the most recent KPI snapshot as a dashboard summary card."""
    snapshot = (
        db.query(KPISnapshot)
        .order_by(desc(KPISnapshot.snapshot_date))
        .first()
    )
    if not snapshot:
        return {"message": "No KPI data available yet."}

    _log(db, current_user, "VIEW_KPI_SUMMARY", "/api/kpi/summary")

    return {
        "snapshot_date":       str(snapshot.snapshot_date),
        "total_revenue":       float(snapshot.total_revenue or 0),
        "transaction_count":   snapshot.transaction_count,
        "unique_customers":    snapshot.unique_customers,
        "avg_order_value":     float(snapshot.avg_order_value or 0),
        "retention_rate":      float(snapshot.retention_rate or 0),
        "churn_rate":          float(snapshot.churn_rate or 0),
        "new_customers":       snapshot.new_customers,
        "returning_customers": snapshot.returning_customers,
        "top_category":        snapshot.top_category,
    }


@router.get("/trends")
def get_kpi_trends(
    months: int = Query(default=6, ge=1, le=24),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*ALLOWED)),
):
    """Return monthly KPI snapshots for trend charts (last N months)."""
    snapshots = (
        db.query(KPISnapshot)
        .order_by(desc(KPISnapshot.snapshot_date))
        .limit(months)
        .all()
    )

    _log(db, current_user, "VIEW_KPI_TRENDS", f"/api/kpi/trends?months={months}")

    return [
        {
            "month":             str(s.snapshot_date),
            "total_revenue":     float(s.total_revenue or 0),
            "transaction_count": s.transaction_count,
            "unique_customers":  s.unique_customers,
            "retention_rate":    float(s.retention_rate or 0),
            "churn_rate":        float(s.churn_rate or 0),
        }
        for s in reversed(snapshots)
    ]


@router.get("/top-categories")
def get_top_categories(
    limit: int = Query(default=5, ge=1, le=20),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*ALLOWED)),
):
    """Return top product categories by total revenue."""
    results = _query_top_categories(db, limit)

    _log(db, current_user, "VIEW_TOP_CATEGORIES", "/api/kpi/top-categories")

    return [
        {"category": r.product_category, "revenue": float(r.revenue), "orders": r.orders}
        for r in results
    ]


@router.get("/top-categories/export")
def export_top_categories(
    limit: int = Query(default=5, ge=1, le=20),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*ALLOWED)),
):
    """Export top product categories by revenue as a downloadable CSV."""
    results = _query_top_categories(db, limit)

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["category", "revenue", "orders"])
    for r in results:
        writer.writerow([r.product_category, float(r.revenue), r.orders])
    buffer.seek(0)

    _log(db, current_user, "EXPORT_TOP_CATEGORIES", "/api/kpi/top-categories/export")

    return StreamingResponse(
        buffer,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=top_categories.csv"},
    )


def _query_top_categories(db: Session, limit: int):
    return (
        db.query(
            Transaction.product_category,
            func.sum(Transaction.amount).label("revenue"),
            func.count(Transaction.transaction_id).label("orders"),
        )
        .filter(Transaction.status == "completed")
        .group_by(Transaction.product_category)
        .order_by(desc("revenue"))
        .limit(limit)
        .all()
    )


# ── Internal helper ──────────────────────────────────────────────────────────

def _log(db: Session, user: User, action: str, resource: str):
    db.add(AuditLog(user_id=user.user_id, action=action, resource=resource))
    db.commit()
