-- ============================================================
-- Secure Cloud-Based Customer Analytics System
-- Database Schema — CS701 Group 3
-- ============================================================

-- --------------------------------------------------------
-- ROLES & USERS (authentication / RBAC)
-- --------------------------------------------------------

CREATE TABLE roles (
    role_id     SERIAL PRIMARY KEY,
    role_name   VARCHAR(50) NOT NULL UNIQUE,   -- 'DataAnalyst', 'SystemAdmin', 'ComplianceOfficer'
    description TEXT
);

CREATE TABLE users (
    user_id       SERIAL PRIMARY KEY,
    username      VARCHAR(100) NOT NULL UNIQUE,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role_id       INT NOT NULL REFERENCES roles(role_id),
    is_active     BOOLEAN DEFAULT TRUE,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    last_login    TIMESTAMPTZ
);

-- --------------------------------------------------------
-- CUSTOMERS
-- --------------------------------------------------------

CREATE TABLE customers (
    customer_id     SERIAL PRIMARY KEY,
    external_id     VARCHAR(100) UNIQUE,        -- ID from CRM source
    first_name      VARCHAR(100),
    last_name       VARCHAR(100),
    email           VARCHAR(255),               -- encrypted at app level (AES-256)
    phone           VARCHAR(50),                -- encrypted at app level
    address         TEXT,                       -- encrypted at app level
    city            VARCHAR(100),
    country         VARCHAR(100),
    registration_date DATE,
    source_system   VARCHAR(50),                -- 'CRM' | 'ECOMMERCE'
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_customers_external_id ON customers(external_id);
CREATE INDEX idx_customers_country     ON customers(country);

-- --------------------------------------------------------
-- TRANSACTIONS
-- --------------------------------------------------------

CREATE TABLE transactions (
    transaction_id   SERIAL PRIMARY KEY,
    customer_id      INT NOT NULL REFERENCES customers(customer_id),
    order_id         VARCHAR(100) UNIQUE,
    amount           NUMERIC(12, 2) NOT NULL,
    currency         CHAR(3) DEFAULT 'USD',
    product_category VARCHAR(100),
    product_name     VARCHAR(255),
    transaction_date TIMESTAMPTZ NOT NULL,
    status           VARCHAR(50),               -- 'completed' | 'refunded' | 'pending'
    source_system    VARCHAR(50),
    created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transactions_customer_id      ON transactions(customer_id);
CREATE INDEX idx_transactions_transaction_date ON transactions(transaction_date);

-- --------------------------------------------------------
-- CUSTOMER SEGMENTS
-- --------------------------------------------------------

CREATE TABLE segments (
    segment_id    SERIAL PRIMARY KEY,
    customer_id   INT NOT NULL REFERENCES customers(customer_id),
    segment_label VARCHAR(100) NOT NULL,        -- 'High-Value', 'At-Risk', 'New', 'Churned'
    score         NUMERIC(5, 2),
    assigned_at   TIMESTAMPTZ DEFAULT NOW(),
    method        VARCHAR(50) DEFAULT 'rule-based'
);

CREATE INDEX idx_segments_customer_id   ON segments(customer_id);
CREATE INDEX idx_segments_segment_label ON segments(segment_label);

-- --------------------------------------------------------
-- KPI SNAPSHOTS
-- --------------------------------------------------------

CREATE TABLE kpi_snapshots (
    snapshot_id           SERIAL PRIMARY KEY,
    snapshot_date         DATE NOT NULL,
    total_revenue         NUMERIC(15, 2),
    transaction_count     INT,
    unique_customers      INT,
    avg_order_value       NUMERIC(10, 2),
    retention_rate        NUMERIC(5, 2),        -- percentage 0–100
    churn_rate            NUMERIC(5, 2),        -- percentage 0–100
    new_customers         INT,
    returning_customers   INT,
    top_category          VARCHAR(100),
    created_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_kpi_snapshots_date ON kpi_snapshots(snapshot_date);

-- --------------------------------------------------------
-- AUDIT LOGS
-- --------------------------------------------------------

CREATE TABLE audit_logs (
    log_id      SERIAL PRIMARY KEY,
    user_id     INT REFERENCES users(user_id),
    action      VARCHAR(100) NOT NULL,          -- 'LOGIN', 'VIEW_DASHBOARD', 'EXPORT_REPORT', etc.
    resource    VARCHAR(255),                   -- endpoint or object accessed
    ip_address  INET,
    status      VARCHAR(20) DEFAULT 'success',  -- 'success' | 'denied' | 'error'
    details     JSONB,
    logged_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user_id   ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_logged_at ON audit_logs(logged_at);
CREATE INDEX idx_audit_logs_action    ON audit_logs(action);

-- --------------------------------------------------------
-- SEED: DEFAULT ROLES
-- --------------------------------------------------------

INSERT INTO roles (role_name, description) VALUES
    ('SystemAdmin',       'Full system access including user management and audit logs'),
    ('DataAnalyst',       'Access to KPI dashboards, segmentation views, and report exports'),
    ('ComplianceOfficer', 'Read-only access to audit logs and compliance reports');
