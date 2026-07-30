"""
routes/extras.py — Revenue forecasting + top products endpoints
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from app.database import get_db
from app.models.models import Transaction, KPISnapshot, AuditLog, User
from app.utils.auth import require_roles, get_current_user

router  = APIRouter()
ALLOWED = ("DataAnalyst", "SystemAdmin")


@router.get("/forecast")
def revenue_forecast(
    periods: int = Query(default=3, ge=1, le=6, description="Months to forecast"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*ALLOWED)),
):
    """
    Simple linear regression forecast using historical KPI monthly revenue.
    Returns historical data + projected next N months.
    """
    snaps = (
        db.query(KPISnapshot)
        .order_by(KPISnapshot.snapshot_date)
        .all()
    )

    if len(snaps) < 2:
        return {"historical": [], "forecast": [], "trend": "insufficient_data"}

    # Build (x, y) pairs — x is month index, y is revenue
    revenues = [float(s.total_revenue or 0) for s in snaps]
    n        = len(revenues)
    x_vals   = list(range(n))

    # Linear regression: y = mx + b
    x_mean = sum(x_vals) / n
    y_mean = sum(revenues) / n
    num    = sum((x - x_mean) * (y - y_mean) for x, y in zip(x_vals, revenues))
    den    = sum((x - x_mean) ** 2 for x in x_vals)
    slope  = num / den if den != 0 else 0
    intercept = y_mean - slope * x_mean

    # Historical data
    historical = [
        {
            "month":   str(s.snapshot_date)[:7],
            "revenue": float(s.total_revenue or 0),
            "type":    "actual",
        }
        for s in snaps
    ]

    # Forecast next N months
    from datetime import date
    last_date = snaps[-1].snapshot_date
    forecast  = []
    for i in range(1, periods + 1):
        month_num = last_date.month + i
        year      = last_date.year + (month_num - 1) // 12
        month     = ((month_num - 1) % 12) + 1
        projected = max(0, slope * (n + i - 1) + intercept)
        forecast.append({
            "month":   f"{year}-{month:02d}",
            "revenue": round(projected, 2),
            "type":    "forecast",
        })

    trend = "upward" if slope > 0 else "downward" if slope < 0 else "flat"

    _audit(db, current_user, "VIEW_FORECAST", "/api/extras/forecast")

    return {
        "historical":  historical,
        "forecast":    forecast,
        "slope":       round(slope, 2),
        "trend":       trend,
        "avg_monthly": round(y_mean, 2),
    }


@router.get("/top-products")
def top_products(
    limit:  int    = Query(default=10, ge=1, le=50),
    sort_by: str   = Query(default="revenue", description="revenue | orders | avg_order"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*ALLOWED)),
):
    """
    Top performing products ranked by revenue, order count, or avg order value.
    """
    rows = (
        db.query(
            Transaction.product_name,
            Transaction.product_category,
            func.sum(Transaction.amount).label("revenue"),
            func.count(Transaction.transaction_id).label("orders"),
            func.avg(Transaction.amount).label("avg_order"),
        )
        .filter(Transaction.status == "completed")
        .group_by(Transaction.product_name, Transaction.product_category)
    )

    if sort_by == "orders":
        rows = rows.order_by(desc("orders"))
    elif sort_by == "avg_order":
        rows = rows.order_by(desc("avg_order"))
    else:
        rows = rows.order_by(desc("revenue"))

    rows = rows.limit(limit).all()

    _audit(db, current_user, "VIEW_TOP_PRODUCTS", "/api/extras/top-products")

    return [
        {
            "rank":      i + 1,
            "product":   r.product_name,
            "category":  r.product_category,
            "revenue":   round(float(r.revenue), 2),
            "orders":    r.orders,
            "avg_order": round(float(r.avg_order), 2),
        }
        for i, r in enumerate(rows)
    ]


def _audit(db: Session, user: User, action: str, resource: str):
    db.add(AuditLog(user_id=user.user_id, action=action, resource=resource, status="success"))
    db.commit()
