"""
routes/analytics.py — Extended analytics endpoints
Adds: date range filtering, customer search, alerts engine
"""

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, text
from typing import Optional
from datetime import date, datetime
from app.database import get_db
from app.models.models import Transaction, Customer, Segment, KPISnapshot, AuditLog, User
from app.utils.auth import require_roles, get_current_user
import pandas as pd
import io

router  = APIRouter()
ALLOWED = ("DataAnalyst", "SystemAdmin")


# ── Date-range filtered KPI summary ──────────────────────────────────────────

@router.get("/summary")
def summary(
    start_date: Optional[date] = Query(default=None),
    end_date:   Optional[date] = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*ALLOWED)),
):
    q = db.query(Transaction).filter(Transaction.status == "completed")
    if start_date:
        q = q.filter(Transaction.transaction_date >= datetime.combine(start_date, datetime.min.time()))
    if end_date:
        q = q.filter(Transaction.transaction_date <= datetime.combine(end_date, datetime.max.time()))

    result = q.with_entities(
        func.sum(Transaction.amount).label("total_revenue"),
        func.count(Transaction.transaction_id).label("total_orders"),
        func.count(func.distinct(Transaction.customer_id)).label("unique_customers"),
        func.avg(Transaction.amount).label("avg_order_value"),
    ).first()

    _audit(db, current_user, "VIEW_FILTERED_SUMMARY", "/api/analytics/summary")

    return {
        "total_revenue":    round(float(result.total_revenue    or 0), 2),
        "total_orders":     result.total_orders     or 0,
        "unique_customers": result.unique_customers or 0,
        "avg_order_value":  round(float(result.avg_order_value or 0), 2),
        "start_date":       str(start_date) if start_date else None,
        "end_date":         str(end_date)   if end_date   else None,
    }


# ── Monthly revenue trend ─────────────────────────────────────────────────────

@router.get("/monthly")
def monthly_trend(
    months: int = Query(default=12, ge=1, le=36),
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(*ALLOWED)),
):
    rows = db.execute(text("""
        SELECT
            TO_CHAR(transaction_date, 'YYYY-MM') AS month,
            SUM(amount)                          AS revenue,
            COUNT(*)                             AS orders
        FROM transactions
        WHERE status = 'completed'
        GROUP BY month
        ORDER BY month DESC
        LIMIT :months
    """), {"months": months}).fetchall()
    return [{"month": r[0], "revenue": float(r[1]), "orders": r[2]}
            for r in reversed(rows)]


# ── Customer growth ───────────────────────────────────────────────────────────

@router.get("/customer-growth")
def customer_growth(
    months: int = Query(default=6, ge=1, le=24),
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(*ALLOWED)),
):
    snaps = (
        db.query(KPISnapshot)
        .order_by(desc(KPISnapshot.snapshot_date))
        .limit(months)
        .all()
    )
    return [
        {
            "month":     str(s.snapshot_date)[:7],
            "new":       s.new_customers       or 0,
            "returning": s.returning_customers or 0,
            "total":     (s.new_customers or 0) + (s.returning_customers or 0),
        }
        for s in reversed(snaps)
    ]


# ── Revenue by category ───────────────────────────────────────────────────────

@router.get("/by-category")
def by_category(
    start_date: Optional[date] = None,
    end_date:   Optional[date] = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(*ALLOWED)),
):
    q = db.query(
        Transaction.product_category,
        func.sum(Transaction.amount).label("revenue"),
        func.count(Transaction.transaction_id).label("orders"),
    ).filter(Transaction.status == "completed")
    if start_date:
        q = q.filter(Transaction.transaction_date >= datetime.combine(start_date, datetime.min.time()))
    if end_date:
        q = q.filter(Transaction.transaction_date <= datetime.combine(end_date, datetime.max.time()))
    rows = q.group_by(Transaction.product_category).order_by(desc("revenue")).all()
    return [{"category": r.product_category, "revenue": float(r.revenue), "orders": r.orders}
            for r in rows]


# ── Customer search ───────────────────────────────────────────────────────────

@router.get("/customers/search")
def search_customers(
    q:     str = Query(description="Search by name, city, or country"),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*ALLOWED)),
):
    search  = f"%{q}%"
    results = db.query(Customer).filter(
        (Customer.first_name.ilike(search)) |
        (Customer.last_name.ilike(search))  |
        (Customer.city.ilike(search))       |
        (Customer.country.ilike(search))
    ).limit(limit).all()

    _audit(db, current_user, "CUSTOMER_SEARCH", f"/api/analytics/customers/search?q={q}")

    return [
        {
            "customer_id": c.customer_id,
            "name":        f"{c.first_name} {c.last_name}",
            "city":        c.city,
            "country":     c.country,
            "source":      c.source_system,
            "registered":  str(c.registration_date) if c.registration_date else None,
        }
        for c in results
    ]


# ── Recent sales ──────────────────────────────────────────────────────────────

@router.get("/recent-sales")
def recent_sales(
    limit:      int            = Query(default=10, ge=1, le=100),
    category:   Optional[str]  = None,
    start_date: Optional[date] = None,
    end_date:   Optional[date] = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(*ALLOWED)),
):
    q = db.query(Transaction, Customer.first_name, Customer.last_name).join(Customer)
    if category:
        q = q.filter(Transaction.product_category == category)
    if start_date:
        q = q.filter(Transaction.transaction_date >= datetime.combine(start_date, datetime.min.time()))
    if end_date:
        q = q.filter(Transaction.transaction_date <= datetime.combine(end_date, datetime.max.time()))
    rows = q.order_by(desc(Transaction.transaction_date)).limit(limit).all()
    return [
        {
            "order_id": t.order_id,
            "customer": f"{fn} {ln}",
            "product":  t.product_name,
            "category": t.product_category,
            "amount":   float(t.amount),
            "date":     str(t.transaction_date)[:10],
            "status":   t.status,
        }
        for t, fn, ln in rows
    ]


# ── Alerts engine ─────────────────────────────────────────────────────────────

@router.get("/alerts")
def get_alerts(
    revenue_threshold: float = Query(default=500.0),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*ALLOWED)),
):
    alerts = []

    # At-risk customers
    at_risk = db.query(Segment, Customer).join(Customer).filter(
        Segment.segment_label == "At-Risk"
    ).all()
    for seg, cust in at_risk:
        alerts.append({
            "type":     "churn_risk",
            "severity": "high",
            "title":    f"Churn Risk: {cust.first_name} {cust.last_name}",
            "message":  f"Customer #{cust.customer_id} from {cust.city} is labeled At-Risk with a segment score of {float(seg.score or 0):.1f}.",
            "action":   "Review purchase history and consider a re-engagement campaign.",
        })

    # Low revenue months
    low_revenue = db.query(KPISnapshot).filter(
        KPISnapshot.total_revenue < revenue_threshold
    ).order_by(desc(KPISnapshot.snapshot_date)).limit(3).all()
    for snap in low_revenue:
        alerts.append({
            "type":     "low_revenue",
            "severity": "medium",
            "title":    f"Low Revenue: {str(snap.snapshot_date)[:7]}",
            "message":  f"Revenue in {str(snap.snapshot_date)[:7]} was ${float(snap.total_revenue or 0):,.2f}, below the threshold of ${revenue_threshold:,.2f}.",
            "action":   "Review sales activity and promotional campaigns for this period.",
        })

    # High churn months
    high_churn = db.query(KPISnapshot).filter(
        KPISnapshot.churn_rate > 5.0
    ).order_by(desc(KPISnapshot.snapshot_date)).limit(3).all()
    for snap in high_churn:
        alerts.append({
            "type":     "high_churn",
            "severity": "high",
            "title":    f"High Churn: {str(snap.snapshot_date)[:7]}",
            "message":  f"Churn rate in {str(snap.snapshot_date)[:7]} was {float(snap.churn_rate or 0):.1f}%, above the 5% warning threshold.",
            "action":   "Investigate customer satisfaction and retention strategies.",
        })

    # New customers
    new_count = db.query(Segment).filter(Segment.segment_label == "New").count()
    if new_count > 0:
        alerts.append({
            "type":     "new_customers",
            "severity": "info",
            "title":    f"{new_count} New Customer(s) Detected",
            "message":  f"{new_count} customer(s) have been labeled New in the latest segmentation run.",
            "action":   "Consider onboarding campaigns to convert new customers into returning buyers.",
        })

    _audit(db, current_user, "VIEW_ALERTS", "/api/analytics/alerts")

    return {
        "total":  len(alerts),
        "high":   sum(1 for a in alerts if a["severity"] == "high"),
        "medium": sum(1 for a in alerts if a["severity"] == "medium"),
        "info":   sum(1 for a in alerts if a["severity"] == "info"),
        "alerts": alerts,
    }


# ── CSV Export ────────────────────────────────────────────────────────────────

@router.get("/export")
def export_csv(
    start_date: Optional[date] = None,
    end_date:   Optional[date] = None,
    category:   Optional[str]  = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(*ALLOWED)),
):
    q = db.query(Transaction, Customer.first_name, Customer.last_name).join(Customer)
    if category:
        q = q.filter(Transaction.product_category == category)
    if start_date:
        q = q.filter(Transaction.transaction_date >= datetime.combine(start_date, datetime.min.time()))
    if end_date:
        q = q.filter(Transaction.transaction_date <= datetime.combine(end_date, datetime.max.time()))
    rows = q.order_by(desc(Transaction.transaction_date)).all()

    data = [
        {
            "order_id": t.order_id,
            "customer": f"{fn} {ln}",
            "product":  t.product_name,
            "category": t.product_category,
            "amount":   float(t.amount),
            "date":     str(t.transaction_date)[:10],
            "status":   t.status,
        }
        for t, fn, ln in rows
    ]

    df     = pd.DataFrame(data)
    output = io.StringIO()
    df.to_csv(output, index=False)
    output.seek(0)

    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=sales_export.csv"},
    )


def _audit(db: Session, user: User, action: str, resource: str):
    db.add(AuditLog(user_id=user.user_id, action=action, resource=resource, status="success"))
    db.commit()