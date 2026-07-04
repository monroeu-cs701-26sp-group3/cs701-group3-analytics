-- ============================================================
-- Mock / Seed Data — CS701 Group 3
-- Run AFTER schema.sql
-- ============================================================

-- Seed users (passwords are real bcrypt hashes of 'Password123!', generated
-- with the app's own passlib CryptContext so verify_password() matches them)
INSERT INTO users (username, email, password_hash, role_id) VALUES
    ('admin',      'admin@analytics.local',      '$2b$12$zJ/vVToW7/TIcaLhSSQSjufzy0EkDlZmG6e4N9BN7fVsVlLsjQdMa', 1),
    ('analyst1',   'analyst@analytics.local',    '$2b$12$twjKt3sPqVhfsnAyK7k4deCoMh.fhzTydvQ50EjcR1pw1eGnpDX/a', 2),
    ('compliance', 'compliance@analytics.local', '$2b$12$fy5LkOJZJosgBc/mhqO7lezLKYnCK.xqG/Iod1CYxwgpyvjEN2nKW', 3);

-- Seed customers (PII fields represent encrypted placeholders in production)
INSERT INTO customers (external_id, first_name, last_name, email, phone, city, country, registration_date, source_system) VALUES
    ('CRM-001', 'Alice',   'Martin',  'ENC:alice@example.com',   'ENC:555-0101', 'New York',   'US', '2023-01-15', 'CRM'),
    ('CRM-002', 'Bob',     'Johnson', 'ENC:bob@example.com',     'ENC:555-0102', 'Chicago',    'US', '2023-03-22', 'CRM'),
    ('CRM-003', 'Carol',   'White',   'ENC:carol@example.com',   'ENC:555-0103', 'Los Angeles','US', '2023-05-10', 'CRM'),
    ('EC-001',  'David',   'Brown',   'ENC:david@example.com',   'ENC:555-0104', 'Houston',    'US', '2023-07-01', 'ECOMMERCE'),
    ('EC-002',  'Eva',     'Garcia',  'ENC:eva@example.com',     'ENC:555-0105', 'Phoenix',    'US', '2023-09-18', 'ECOMMERCE'),
    ('EC-003',  'Frank',   'Lee',     'ENC:frank@example.com',   'ENC:555-0106', 'Toronto',    'CA', '2024-01-05', 'ECOMMERCE'),
    ('CRM-004', 'Grace',   'Kim',     'ENC:grace@example.com',   'ENC:555-0107', 'London',     'GB', '2024-02-14', 'CRM'),
    ('EC-004',  'Henry',   'Patel',   'ENC:henry@example.com',   'ENC:555-0108', 'New York',   'US', '2024-03-30', 'ECOMMERCE'),
    ('CRM-005', 'Irene',   'Smith',   'ENC:irene@example.com',   'ENC:555-0109', 'Chicago',    'US', '2024-05-11', 'CRM'),
    ('EC-005',  'James',   'Wang',    'ENC:james@example.com',   'ENC:555-0110', 'San Francisco','US','2024-06-20','ECOMMERCE');

-- Seed transactions
INSERT INTO transactions (customer_id, order_id, amount, currency, product_category, product_name, transaction_date, status, source_system) VALUES
    (1, 'ORD-1001', 250.00, 'USD', 'Electronics',  'Bluetooth Speaker',   '2024-01-10 09:00:00+00', 'completed', 'ECOMMERCE'),
    (1, 'ORD-1002', 89.99,  'USD', 'Accessories',  'Phone Case',          '2024-02-20 14:30:00+00', 'completed', 'ECOMMERCE'),
    (2, 'ORD-1003', 499.00, 'USD', 'Electronics',  'Tablet',              '2024-01-25 11:15:00+00', 'completed', 'ECOMMERCE'),
    (3, 'ORD-1004', 35.50,  'USD', 'Books',        'Python Programming',  '2024-03-05 16:00:00+00', 'completed', 'ECOMMERCE'),
    (4, 'ORD-1005', 120.00, 'USD', 'Clothing',     'Winter Jacket',       '2024-03-15 10:00:00+00', 'completed', 'ECOMMERCE'),
    (5, 'ORD-1006', 750.00, 'USD', 'Electronics',  'Smartwatch',          '2024-04-01 13:00:00+00', 'completed', 'ECOMMERCE'),
    (5, 'ORD-1007', 50.00,  'USD', 'Books',        'Data Science Guide',  '2024-04-22 09:45:00+00', 'completed', 'ECOMMERCE'),
    (6, 'ORD-1008', 200.00, 'USD', 'Accessories',  'Laptop Stand',        '2024-05-10 15:30:00+00', 'completed', 'ECOMMERCE'),
    (7, 'ORD-1009', 999.00, 'USD', 'Electronics',  'Noise-Cancel Headphones','2024-05-18 08:00:00+00','completed','ECOMMERCE'),
    (8, 'ORD-1010', 65.00,  'USD', 'Clothing',     'Running Shoes',       '2024-06-01 12:00:00+00', 'refunded',  'ECOMMERCE'),
    (9, 'ORD-1011', 320.00, 'USD', 'Electronics',  'Mechanical Keyboard', '2024-06-12 17:00:00+00', 'completed', 'ECOMMERCE'),
    (10,'ORD-1012', 180.00, 'USD', 'Accessories',  'Webcam HD',           '2024-07-04 10:30:00+00', 'completed', 'ECOMMERCE'),
    (1, 'ORD-1013', 45.00,  'USD', 'Books',        'Cloud Computing',     '2024-07-20 14:00:00+00', 'completed', 'ECOMMERCE'),
    (3, 'ORD-1014', 600.00, 'USD', 'Electronics',  'Portable Monitor',    '2024-08-05 11:00:00+00', 'completed', 'ECOMMERCE'),
    (2, 'ORD-1015', 25.00,  'USD', 'Accessories',  'USB Hub',             '2024-08-19 09:00:00+00', 'completed', 'ECOMMERCE');

-- Seed segments
INSERT INTO segments (customer_id, segment_label, score) VALUES
    (1, 'High-Value',  85.0),
    (2, 'High-Value',  78.5),
    (3, 'High-Value',  82.0),
    (4, 'At-Risk',     40.0),
    (5, 'High-Value',  90.0),
    (6, 'Returning',   65.0),
    (7, 'High-Value',  88.0),
    (8, 'At-Risk',     35.0),
    (9, 'Returning',   60.0),
    (10,'New',         20.0);

-- Seed KPI snapshots
INSERT INTO kpi_snapshots (snapshot_date, total_revenue, transaction_count, unique_customers, avg_order_value, retention_rate, churn_rate, new_customers, returning_customers, top_category) VALUES
    ('2024-01-31', 749.00,  2, 2, 374.50, 0.00,  0.00,  2, 0, 'Electronics'),
    ('2024-02-29', 89.99,   1, 1, 89.99,  50.00, 10.00, 0, 1, 'Accessories'),
    ('2024-03-31', 155.50,  2, 2, 77.75,  60.00, 8.00,  1, 1, 'Electronics'),
    ('2024-04-30', 800.00,  2, 1, 400.00, 70.00, 5.00,  0, 1, 'Electronics'),
    ('2024-05-31', 1199.00, 2, 2, 599.50, 72.00, 6.00,  1, 1, 'Electronics'),
    ('2024-06-30', 385.00,  2, 2, 192.50, 68.00, 7.00,  0, 2, 'Electronics'),
    ('2024-07-31', 225.00,  2, 2, 112.50, 75.00, 4.00,  1, 1, 'Books'),
    ('2024-08-31', 625.00,  2, 2, 312.50, 78.00, 3.50,  0, 2, 'Electronics');
