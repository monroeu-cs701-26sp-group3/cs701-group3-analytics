"""
ETL Ingestion Script — CS701 Group 3
Simulates pulling data from mock CRM and e-commerce APIs,
transforming it, and loading it into the PostgreSQL database.

Run: python -m app.services.etl_ingestion
"""

import json
import random
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session, selectinload
from app.database import SessionLocal
from app.models.models import Customer, Transaction, Segment, KPISnapshot
from app.utils.encryption import encrypt_field


# ── Simulated CRM API response ───────────────────────────────────────────────

def fetch_mock_crm_data() -> list[dict]:
    """Simulate CRM REST API returning customer profile JSON."""
    return [
        {"external_id": "CRM-101", "first_name": "Laura",  "last_name": "Chen",
         "email": "laura.chen@example.com",  "phone": "555-2001",
         "city": "Seattle", "country": "US", "registration_date": "2025-01-10"},
        {"external_id": "CRM-102", "first_name": "Marcus", "last_name": "Diaz",
         "email": "marcus.diaz@example.com", "phone": "555-2002",
         "city": "Miami",   "country": "US", "registration_date": "2025-02-14"},
        {"external_id": "CRM-103", "first_name": "Priya",  "last_name": "Nair",
         "email": "priya.nair@example.com",  "phone": "555-2003",
         "city": "Austin",  "country": "US", "registration_date": "2025-03-22"},
    ]


# ── Simulated e-commerce API response ───────────────────────────────────────

def fetch_mock_ecommerce_data() -> list[dict]:
    """Simulate e-commerce API returning transaction JSON."""
    return [
        {"order_id": "EC-2001", "customer_external_id": "CRM-101",
         "amount": 349.99, "currency": "USD", "product_category": "Electronics",
         "product_name": "Wireless Earbuds",
         "transaction_date": "2025-04-05T10:00:00Z", "status": "completed"},
        {"order_id": "EC-2002", "customer_external_id": "CRM-102",
         "amount": 79.50, "currency": "USD", "product_category": "Books",
         "product_name": "Machine Learning Basics",
         "transaction_date": "2025-04-12T14:30:00Z", "status": "completed"},
        {"order_id": "EC-2003", "customer_external_id": "CRM-103",
         "amount": 520.00, "currency": "USD", "product_category": "Electronics",
         "product_name": "Compact Camera",
         "transaction_date": "2025-05-01T09:15:00Z", "status": "completed"},
    ]


# ── ETL: Transform & Load ────────────────────────────────────────────────────

def run_etl():
    db: Session = SessionLocal()
    print("[ETL] Starting ingestion run...")

    # 1. Ingest customers from CRM
    crm_records = fetch_mock_crm_data()
    for record in crm_records:
        existing = db.query(Customer).filter(
            Customer.external_id == record["external_id"]
        ).first()

        if not existing:
            customer = Customer(
                external_id=record["external_id"],
                first_name=record["first_name"],
                last_name=record["last_name"],
                email=encrypt_field(record["email"]),         # PII encrypted
                phone=encrypt_field(record["phone"]),         # PII encrypted
                city=record["city"],
                country=record["country"],
                registration_date=datetime.strptime(
                    record["registration_date"], "%Y-%m-%d"
                ).date(),
                source_system="CRM",
            )
            db.add(customer)
            print(f"  [+] Inserted customer: {record['external_id']}")
        else:
            print(f"  [=] Skipped duplicate: {record['external_id']}")

    db.commit()

    # 2. Ingest transactions from e-commerce API
    ecom_records = fetch_mock_ecommerce_data()
    for record in ecom_records:
        existing_tx = db.query(Transaction).filter(
            Transaction.order_id == record["order_id"]
        ).first()
        if existing_tx:
            print(f"  [=] Skipped duplicate transaction: {record['order_id']}")
            continue

        customer = db.query(Customer).filter(
            Customer.external_id == record["customer_external_id"]
        ).first()
        if not customer:
            print(f"  [!] Customer not found for order {record['order_id']}, skipping")
            continue

        tx = Transaction(
            customer_id=customer.customer_id,
            order_id=record["order_id"],
            amount=record["amount"],
            currency=record["currency"],
            product_category=record["product_category"],
            product_name=record["product_name"],
            transaction_date=datetime.fromisoformat(
                record["transaction_date"].replace("Z", "+00:00")
            ),
            status=record["status"],
            source_system="ECOMMERCE",
        )
        db.add(tx)
        print(f"  [+] Inserted transaction: {record['order_id']}")

    db.commit()

    # 3. Apply simple rule-based segmentation to new customers
    _run_segmentation(db)

    # 4. Generate a KPI snapshot for today
    _generate_kpi_snapshot(db)

    db.close()
    print("[ETL] Ingestion run complete.")


def _run_segmentation(db: Session):
    """Assign segment labels based on transaction history (rule-based)."""
    already_segmented = {
        row.customer_id for row in db.query(Segment.customer_id).distinct()
    }
    customers = db.query(Customer).options(selectinload(Customer.transactions)).all()
    for c in customers:
        if c.customer_id in already_segmented:
            continue  # Already segmented

        total_spent = sum(
            float(t.amount) for t in c.transactions if t.status == "completed"
        )

        if total_spent >= 500:
            label, score = "High-Value", min(100.0, total_spent / 10)
        elif total_spent > 0:
            label, score = "Returning", total_spent / 5
        else:
            label, score = "New", 10.0

        db.add(Segment(customer_id=c.customer_id, segment_label=label, score=score))
    db.commit()
    print("[ETL] Segmentation complete.")


def _generate_kpi_snapshot(db: Session):
    """Compute and store a KPI snapshot for today."""
    from sqlalchemy import func
    from datetime import date

    today = date.today()
    existing = db.query(KPISnapshot).filter(
        KPISnapshot.snapshot_date == today
    ).first()
    if existing:
        print("[ETL] KPI snapshot already exists for today.")
        return

    result = db.query(
        func.sum(Transaction.amount).label("revenue"),
        func.count(Transaction.transaction_id).label("tx_count"),
        func.count(func.distinct(Transaction.customer_id)).label("unique_customers"),
        func.avg(Transaction.amount).label("aov"),
    ).filter(Transaction.status == "completed").first()

    # Per-customer completed-order counts and most recent order date, used to
    # classify new vs. returning customers and estimate churn/retention.
    per_customer = (
        db.query(
            Transaction.customer_id,
            func.count(Transaction.transaction_id).label("orders"),
            func.max(Transaction.transaction_date).label("last_order"),
        )
        .filter(Transaction.status == "completed")
        .group_by(Transaction.customer_id)
        .all()
    )

    active_customers = len(per_customer)
    returning_customers = sum(1 for row in per_customer if row.orders > 1)
    new_customers = active_customers - returning_customers

    churn_cutoff = datetime.now(timezone.utc) - timedelta(days=90)
    churned_customers = sum(
        1 for row in per_customer
        if row.last_order and row.last_order < churn_cutoff
    )

    retention_rate = round((returning_customers / active_customers) * 100, 2) if active_customers else 0.0
    churn_rate = round((churned_customers / active_customers) * 100, 2) if active_customers else 0.0

    top_category_row = (
        db.query(Transaction.product_category, func.sum(Transaction.amount).label("revenue"))
        .filter(Transaction.status == "completed")
        .group_by(Transaction.product_category)
        .order_by(func.sum(Transaction.amount).desc())
        .first()
    )

    snapshot = KPISnapshot(
        snapshot_date=today,
        total_revenue=result.revenue or 0,
        transaction_count=result.tx_count or 0,
        unique_customers=result.unique_customers or 0,
        avg_order_value=result.aov or 0,
        retention_rate=retention_rate,
        churn_rate=churn_rate,
        new_customers=new_customers,
        returning_customers=returning_customers,
        top_category=top_category_row.product_category if top_category_row else None,
    )
    db.add(snapshot)
    db.commit()
    print(f"[ETL] KPI snapshot created for {today}.")


if __name__ == "__main__":
    run_etl()
