"""
SQLAlchemy ORM Models — mirrors database/schema.sql
"""

from sqlalchemy import (
    Column, Integer, String, Boolean, Numeric, Date,
    ForeignKey, Text, TIMESTAMP, JSON
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Role(Base):
    __tablename__ = "roles"

    role_id     = Column(Integer, primary_key=True, index=True)
    role_name   = Column(String(50), nullable=False, unique=True)
    description = Column(Text)

    users = relationship("User", back_populates="role")


class User(Base):
    __tablename__ = "users"

    user_id       = Column(Integer, primary_key=True, index=True)
    username      = Column(String(100), nullable=False, unique=True)
    email         = Column(String(255), nullable=False, unique=True)
    password_hash = Column(String(255), nullable=False)
    role_id       = Column(Integer, ForeignKey("roles.role_id"), nullable=False)
    is_active     = Column(Boolean, default=True)
    created_at    = Column(TIMESTAMP(timezone=True), server_default=func.now())
    last_login    = Column(TIMESTAMP(timezone=True))

    role       = relationship("Role", back_populates="users")
    audit_logs = relationship("AuditLog", back_populates="user")


class Customer(Base):
    __tablename__ = "customers"

    customer_id       = Column(Integer, primary_key=True, index=True)
    external_id       = Column(String(100), unique=True)
    first_name        = Column(String(100))
    last_name         = Column(String(100))
    email             = Column(String(255))          # stored encrypted
    phone             = Column(String(50))           # stored encrypted
    address           = Column(Text)                 # stored encrypted
    city              = Column(String(100))
    country           = Column(String(100))
    registration_date = Column(Date)
    source_system     = Column(String(50))
    created_at        = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at        = Column(TIMESTAMP(timezone=True), server_default=func.now())

    transactions = relationship("Transaction", back_populates="customer")
    segments     = relationship("Segment",     back_populates="customer")


class Transaction(Base):
    __tablename__ = "transactions"

    transaction_id   = Column(Integer, primary_key=True, index=True)
    customer_id      = Column(Integer, ForeignKey("customers.customer_id"), nullable=False)
    order_id         = Column(String(100), unique=True)
    amount           = Column(Numeric(12, 2), nullable=False)
    currency         = Column(String(3), default="USD")
    product_category = Column(String(100))
    product_name     = Column(String(255))
    transaction_date = Column(TIMESTAMP(timezone=True), nullable=False)
    status           = Column(String(50))
    source_system    = Column(String(50))
    created_at       = Column(TIMESTAMP(timezone=True), server_default=func.now())

    customer = relationship("Customer", back_populates="transactions")


class Segment(Base):
    __tablename__ = "segments"

    segment_id    = Column(Integer, primary_key=True, index=True)
    customer_id   = Column(Integer, ForeignKey("customers.customer_id"), nullable=False)
    segment_label = Column(String(100), nullable=False)
    score         = Column(Numeric(5, 2))
    assigned_at   = Column(TIMESTAMP(timezone=True), server_default=func.now())
    method        = Column(String(50), default="rule-based")

    customer = relationship("Customer", back_populates="segments")


class KPISnapshot(Base):
    __tablename__ = "kpi_snapshots"

    snapshot_id         = Column(Integer, primary_key=True, index=True)
    snapshot_date       = Column(Date, nullable=False)
    total_revenue       = Column(Numeric(15, 2))
    transaction_count   = Column(Integer)
    unique_customers    = Column(Integer)
    avg_order_value     = Column(Numeric(10, 2))
    retention_rate      = Column(Numeric(5, 2))
    churn_rate          = Column(Numeric(5, 2))
    new_customers       = Column(Integer)
    returning_customers = Column(Integer)
    top_category        = Column(String(100))
    created_at          = Column(TIMESTAMP(timezone=True), server_default=func.now())


class AuditLog(Base):
    __tablename__ = "audit_logs"

    log_id     = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.user_id"))
    action     = Column(String(100), nullable=False)
    resource   = Column(String(255))
    ip_address = Column(String(45))
    status     = Column(String(20), default="success")
    details    = Column(JSON)
    logged_at  = Column(TIMESTAMP(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="audit_logs")
