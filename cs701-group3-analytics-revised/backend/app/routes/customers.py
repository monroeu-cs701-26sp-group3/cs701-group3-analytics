"""
Customer routes — list, detail, search.
DataAnalyst / SystemAdmin only. PII fields are decrypted on response.
"""

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional
from app.database import get_db
from app.models.models import Customer, AuditLog
from app.utils.auth import require_roles
from app.utils.encryption import decrypt_field
from app.models.models import User

router = APIRouter()

ALLOWED = ("DataAnalyst", "SystemAdmin")


@router.get("/")
def list_customers(
    skip:    int = Query(default=0, ge=0),
    limit:   int = Query(default=20, ge=1, le=100),
    country: Optional[str] = None,
    source:  Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*ALLOWED)),
):
    """List customers with optional filters. Returns paginated results."""
    query = db.query(Customer)
    if country:
        query = query.filter(Customer.country == country)
    if source:
        query = query.filter(Customer.source_system == source.upper())

    total     = query.count()
    customers = query.offset(skip).limit(limit).all()

    _log(db, current_user, "LIST_CUSTOMERS", "/api/customers/")

    return {
        "total": total,
        "skip":  skip,
        "limit": limit,
        "data":  [_serialize(c) for c in customers],
    }


@router.get("/{customer_id}")
def get_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*ALLOWED)),
):
    """Return a single customer record (PII decrypted)."""
    customer = db.query(Customer).filter(Customer.customer_id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    _log(db, current_user, "VIEW_CUSTOMER", f"/api/customers/{customer_id}")

    return _serialize(customer, include_pii=True)


# ── Helpers ──────────────────────────────────────────────────────────────────

def _serialize(c: Customer, include_pii: bool = False) -> dict:
    base = {
        "customer_id":       c.customer_id,
        "external_id":       c.external_id,
        "first_name":        c.first_name,
        "last_name":         c.last_name,
        "city":              c.city,
        "country":           c.country,
        "registration_date": str(c.registration_date) if c.registration_date else None,
        "source_system":     c.source_system,
    }
    if include_pii:
        base["email"]   = decrypt_field(c.email)
        base["phone"]   = decrypt_field(c.phone)
        base["address"] = decrypt_field(c.address)
    return base


def _log(db: Session, user: User, action: str, resource: str):
    db.add(AuditLog(user_id=user.user_id, action=action, resource=resource))
    db.commit()
