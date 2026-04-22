-- ============================================================
-- DATASHIFTER TEST TABLES — PostgreSQL
--
-- Source: 3 tables (src_customers, src_orders, src_products)
-- Target: 2 tables (tgt_customer_analytics, tgt_order_summary)
--
-- Deliberate differences between source and target:
--   - Column name mismatches (test auto-map + manual mapping)
--   - Type mismatches (test TO_NUMBER, TO_DATE, TO_STRING transforms)
--   - NOT NULL targets without obvious source (test DEFAULT_IF_NULL)
--   - N:1 scenario (orders + products → order_summary)
--   - 1:N scenario (customers → customer_analytics)
-- ============================================================

-- Create a dedicated schema for test data
CREATE SCHEMA IF NOT EXISTS ds_source;
CREATE SCHEMA IF NOT EXISTS ds_target;

-- ============================================================
-- SOURCE TABLES
-- ============================================================

-- Source 1: Customers
CREATE TABLE ds_source.src_customers (
    cust_id         SERIAL PRIMARY KEY,
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100) NOT NULL,
    email_address   VARCHAR(255) UNIQUE NOT NULL,
    phone_number    VARCHAR(30),
    date_of_birth   VARCHAR(20),              -- stored as string 'YYYY-MM-DD' (test TO_DATE)
    country_code    CHAR(3),                  -- 'USA', 'IND', 'GBR'
    signup_date     TIMESTAMP NOT NULL DEFAULT NOW(),
    loyalty_points  VARCHAR(10),              -- stored as string '1500' (test TO_NUMBER)
    is_active       VARCHAR(5) DEFAULT 'true' -- stored as string 'true'/'false'
);

-- Source 2: Orders
CREATE TABLE ds_source.src_orders (
    order_id        SERIAL PRIMARY KEY,
    customer_id     INTEGER NOT NULL REFERENCES ds_source.src_customers(cust_id),
    order_date      TIMESTAMP NOT NULL DEFAULT NOW(),
    status          VARCHAR(20) NOT NULL DEFAULT 'PENDING',  -- PENDING, SHIPPED, DELIVERED, CANCELLED
    total_amount    NUMERIC(12, 2) NOT NULL,
    currency        CHAR(3) NOT NULL DEFAULT 'USD',
    shipping_addr   TEXT,
    notes           TEXT,
    discount_pct    NUMERIC(5, 2) DEFAULT 0,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Source 3: Products
CREATE TABLE ds_source.src_products (
    product_id      SERIAL PRIMARY KEY,
    sku             VARCHAR(50) UNIQUE NOT NULL,
    product_name    VARCHAR(200) NOT NULL,
    category        VARCHAR(100),
    unit_price      NUMERIC(10, 2) NOT NULL,
    weight_kg       NUMERIC(8, 3),
    in_stock        BOOLEAN DEFAULT TRUE,
    description     TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Junction: order line items (links orders ↔ products)
CREATE TABLE ds_source.src_order_items (
    item_id         SERIAL PRIMARY KEY,
    order_id        INTEGER NOT NULL REFERENCES ds_source.src_orders(order_id),
    product_id      INTEGER NOT NULL REFERENCES ds_source.src_products(product_id),
    quantity        INTEGER NOT NULL DEFAULT 1,
    unit_price      NUMERIC(10, 2) NOT NULL,
    line_total      NUMERIC(12, 2) NOT NULL
);

-- ============================================================
-- TARGET TABLES
-- ============================================================

-- Target 1: Customer Analytics (flattened + enriched)
-- Tests: column rename, type conversion, default values, UPPER/TRIM
CREATE TABLE ds_target.tgt_customer_analytics (
    id              SERIAL PRIMARY KEY,
    customer_ref    INTEGER NOT NULL,                     -- maps from cust_id
    full_name       VARCHAR(200) NOT NULL,                -- CONCAT(first_name, ' ', last_name)
    email           VARCHAR(255) NOT NULL,                -- maps from email_address
    phone           VARCHAR(30),                          -- maps from phone_number
    birth_date      DATE,                                 -- TO_DATE from date_of_birth string
    country         VARCHAR(50) NOT NULL DEFAULT 'UNKNOWN', -- maps from country_code (needs DEFAULT_IF_NULL)
    member_since    TIMESTAMP NOT NULL,                   -- maps from signup_date
    points          INTEGER DEFAULT 0,                    -- TO_NUMBER from loyalty_points string
    active          BOOLEAN DEFAULT TRUE,                 -- from is_active string
    segment         VARCHAR(30) NOT NULL DEFAULT 'STANDARD', -- no source column (needs DEFAULT_IF_NULL)
    region          VARCHAR(50),                          -- derived or default
    migrated_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Target 2: Order Summary (denormalized orders + product info)
-- Tests: N:1 (orders + products → single target), numeric transforms
CREATE TABLE ds_target.tgt_order_summary (
    id              SERIAL PRIMARY KEY,
    order_ref       INTEGER NOT NULL,                     -- maps from order_id
    customer_ref    INTEGER NOT NULL,                     -- maps from customer_id
    order_date      DATE NOT NULL,                        -- cast TIMESTAMP → DATE
    order_status    VARCHAR(20) NOT NULL,                 -- maps from status (UPPER transform)
    amount          NUMERIC(12, 2) NOT NULL,              -- maps from total_amount
    currency_code   CHAR(3) NOT NULL,                     -- maps from currency
    discount        NUMERIC(5, 2) DEFAULT 0,              -- maps from discount_pct
    net_amount      NUMERIC(12, 2),                       -- no direct source (computed: amount - discount)
    shipping_city   VARCHAR(100),                         -- SUBSTRING from shipping_addr
    memo            TEXT,                                  -- maps from notes (TRIM)
    source_system   VARCHAR(30) NOT NULL DEFAULT 'LEGACY', -- no source column (DEFAULT_IF_NULL)
    imported_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SAMPLE DATA — Source tables
-- ============================================================

-- Customers (20 rows)
INSERT INTO ds_source.src_customers (first_name, last_name, email_address, phone_number, date_of_birth, country_code, loyalty_points, is_active) VALUES
('  John  ', 'Doe', 'john.doe@email.com', '+1-555-0101', '1985-03-15', 'USA', '2500', 'true'),
('Jane', 'Smith', 'jane.smith@email.com', '+1-555-0102', '1990-07-22', 'USA', '1800', 'true'),
('Raj', 'Patel', 'raj.patel@email.com', '+91-98765-43210', '1988-11-05', 'IND', '3200', 'true'),
('Emily', 'Brown', 'emily.b@email.com', '+44-20-7946-0958', '1992-01-30', 'GBR', '900', 'false'),
('  Carlos  ', 'Garcia', 'carlos.g@email.com', '+34-612-345-678', '1995-06-18', 'ESP', '150', 'true'),
('Yuki', 'Tanaka', 'yuki.t@email.com', '+81-80-1234-5678', '1987-09-12', 'JPN', '4100', 'true'),
('Anna', 'Mueller', 'anna.m@email.com', NULL, '1993-04-25', 'DEU', NULL, 'true'),
('Chen', 'Wei', 'chen.wei@email.com', '+86-138-0013-8000', 'invalid-date', 'CHN', '2800', 'true'),
('Maria', 'Silva', 'maria.s@email.com', '+55-11-99999-0000', '1991-12-08', 'BRA', '600', 'false'),
('Ahmed', 'Hassan', 'ahmed.h@email.com', '+20-100-000-0000', '1986-08-20', 'EGY', '1500', 'true'),
('Sophie', 'Dubois', 'sophie.d@email.com', '+33-6-12-34-56-78', '1994-02-14', NULL, '2200', 'true'),
('Liam', 'OConnor', 'liam.o@email.com', '+353-87-123-4567', '1989-10-31', 'IRL', 'abc', 'true'),
('Priya', 'Sharma', 'priya.s@email.com', '+91-99887-76655', '1996-05-09', 'IND', '3500', 'true'),
('  Marco  ', 'Rossi', 'marco.r@email.com', '+39-333-123-4567', '1984-07-04', 'ITA', '1100', 'true'),
('Kim', 'Park', 'kim.park@email.com', '+82-10-1234-5678', '1997-03-28', 'KOR', '750', 'false'),
('David', 'Wilson', 'david.w@email.com', NULL, NULL, 'USA', NULL, 'true'),
('Fatima', 'Al-Rashid', 'fatima.r@email.com', '+966-50-123-4567', '1990-11-15', 'SAU', '1900', 'true'),
('Hans', 'Schmidt', 'hans.s@email.com', '+49-170-123-4567', '1983-06-21', 'DEU', '2600', 'true'),
('Nina', 'Petrov', 'nina.p@email.com', '+7-916-123-45-67', '1991-09-03', 'RUS', '400', 'false'),
('Tom', 'Anderson', 'tom.a@email.com', '+1-555-0120', '1988-01-17', 'USA', '3100', 'true');

-- Products (10 rows)
INSERT INTO ds_source.src_products (sku, product_name, category, unit_price, weight_kg, in_stock, description) VALUES
('SKU-LAPTOP-001', 'ProBook Laptop 15"', 'Electronics', 999.99, 2.100, TRUE, 'High-performance laptop with 16GB RAM'),
('SKU-PHONE-001', 'SmartPhone X12', 'Electronics', 699.99, 0.185, TRUE, 'Latest smartphone with 5G'),
('SKU-CHAIR-001', 'ErgoChair Pro', 'Furniture', 449.99, 15.500, TRUE, 'Ergonomic office chair'),
('SKU-DESK-001', 'StandUp Desk 60"', 'Furniture', 599.99, 35.000, FALSE, 'Motorized standing desk'),
('SKU-HEAD-001', 'NoiseCancel Headphones', 'Electronics', 299.99, 0.250, TRUE, 'Over-ear noise cancelling'),
('SKU-MOUSE-001', 'Precision Mouse', 'Electronics', 79.99, 0.095, TRUE, 'Wireless ergonomic mouse'),
('SKU-MON-001', 'UltraWide Monitor 34"', 'Electronics', 549.99, 8.200, TRUE, '34-inch curved ultrawide'),
('SKU-KEY-001', 'Mechanical Keyboard', 'Electronics', 149.99, 0.850, TRUE, 'Cherry MX Blue switches'),
('SKU-BAG-001', 'Laptop Backpack', 'Accessories', 89.99, 1.200, TRUE, 'Water-resistant 15" laptop backpack'),
('SKU-CAM-001', 'HD Webcam Pro', 'Electronics', 129.99, 0.150, FALSE, '4K webcam with auto-focus');

-- Orders (30 rows)
INSERT INTO ds_source.src_orders (customer_id, order_date, status, total_amount, currency, shipping_addr, notes, discount_pct) VALUES
(1, '2024-01-15 10:30:00', 'DELIVERED', 999.99, 'USD', '123 Main St, New York, NY 10001', 'Handle with care', 0),
(1, '2024-02-20 14:15:00', 'DELIVERED', 149.99, 'USD', '123 Main St, New York, NY 10001', NULL, 5.00),
(2, '2024-01-18 09:00:00', 'DELIVERED', 1499.98, 'USD', '456 Oak Ave, Los Angeles, CA 90001', '  Gift wrap please  ', 10.00),
(3, '2024-02-01 11:45:00', 'SHIPPED', 699.99, 'INR', '789 MG Road, Mumbai 400001', NULL, 0),
(3, '2024-03-10 16:30:00', 'PENDING', 449.99, 'INR', '789 MG Road, Mumbai 400001', 'Deliver after 5pm', 0),
(4, '2024-01-25 13:20:00', 'CANCELLED', 299.99, 'GBP', '10 Baker St, London W1U 3BW', 'Wrong item ordered', 0),
(5, '2024-02-14 08:00:00', 'DELIVERED', 79.99, 'EUR', 'Calle Mayor 1, Madrid 28013', NULL, 15.00),
(6, '2024-03-01 10:00:00', 'SHIPPED', 549.99, 'JPY', '1-2-3 Shibuya, Tokyo 150-0002', '  Expedited shipping  ', 0),
(7, '2024-02-28 15:45:00', 'DELIVERED', 599.99, 'EUR', 'Berliner Str 5, Berlin 10115', NULL, 5.00),
(8, '2024-03-15 12:00:00', 'PENDING', 1249.98, 'CNY', '100 Nanjing Rd, Shanghai 200001', NULL, 0),
(9, '2024-01-10 09:30:00', 'DELIVERED', 89.99, 'BRL', 'Rua Augusta 100, São Paulo 01310', NULL, 0),
(10, '2024-02-05 14:00:00', 'SHIPPED', 699.99, 'EGP', '5 Tahrir Sq, Cairo 11511', 'Fragile', 0),
(11, '2024-03-20 11:00:00', 'PENDING', 449.99, 'EUR', '15 Champs-Élysées, Paris 75008', NULL, 20.00),
(12, '2024-01-30 16:00:00', 'DELIVERED', 129.99, 'EUR', '8 Grafton St, Dublin D02', NULL, 0),
(13, '2024-02-15 10:30:00', 'DELIVERED', 1049.98, 'INR', '22 Brigade Rd, Bangalore 560001', '  Leave at door  ', 0),
(1, '2024-03-25 09:00:00', 'PENDING', 549.99, 'USD', '123 Main St, New York, NY 10001', NULL, 10.00),
(14, '2024-02-10 13:00:00', 'SHIPPED', 229.98, 'EUR', 'Via Roma 10, Rome 00100', NULL, 0),
(15, '2024-03-05 08:45:00', 'CANCELLED', 999.99, 'KRW', '123 Gangnam-gu, Seoul 06000', 'Price too high', 0),
(16, '2024-01-20 11:30:00', 'DELIVERED', 79.99, 'USD', '789 Pine Rd, Chicago, IL 60601', NULL, 0),
(17, '2024-02-25 15:00:00', 'DELIVERED', 149.99, 'SAR', '50 King Fahd Rd, Riyadh 12211', NULL, 5.00),
(18, '2024-03-12 10:15:00', 'SHIPPED', 599.99, 'EUR', 'Hauptstr 20, Munich 80331', 'Business address', 0),
(19, '2024-01-05 14:30:00', 'DELIVERED', 89.99, 'RUB', 'Tverskaya 15, Moscow 125009', NULL, 0),
(20, '2024-02-08 09:15:00', 'DELIVERED', 1549.98, 'USD', '555 Elm St, Austin, TX 73301', '  Priority shipping  ', 0),
(3, '2024-03-28 16:45:00', 'PENDING', 129.99, 'INR', '789 MG Road, Mumbai 400001', NULL, 0),
(5, '2024-01-12 12:00:00', 'DELIVERED', 299.99, 'EUR', 'Calle Mayor 1, Madrid 28013', NULL, 10.00),
(8, '2024-02-18 08:30:00', 'SHIPPED', 449.99, 'CNY', '100 Nanjing Rd, Shanghai 200001', NULL, 0),
(10, '2024-03-08 14:45:00', 'PENDING', 79.99, 'EGP', '5 Tahrir Sq, Cairo 11511', NULL, 0),
(13, '2024-01-28 10:00:00', 'DELIVERED', 549.99, 'INR', '22 Brigade Rd, Bangalore 560001', NULL, 0),
(6, '2024-02-22 13:30:00', 'DELIVERED', 229.98, 'JPY', '1-2-3 Shibuya, Tokyo 150-0002', NULL, 5.00),
(20, '2024-03-18 09:45:00', 'SHIPPED', 699.99, 'USD', '555 Elm St, Austin, TX 73301', 'Signature required', 0);

-- Order items (45 rows)
INSERT INTO ds_source.src_order_items (order_id, product_id, quantity, unit_price, line_total) VALUES
(1, 1, 1, 999.99, 999.99),
(2, 8, 1, 149.99, 149.99),
(3, 2, 1, 699.99, 699.99), (3, 5, 1, 299.99, 299.99), (3, 6, 1, 79.99, 79.99),
(4, 2, 1, 699.99, 699.99),
(5, 3, 1, 449.99, 449.99),
(6, 5, 1, 299.99, 299.99),
(7, 6, 1, 79.99, 79.99),
(8, 7, 1, 549.99, 549.99),
(9, 4, 1, 599.99, 599.99),
(10, 1, 1, 999.99, 999.99), (10, 8, 1, 149.99, 149.99), (10, 6, 1, 79.99, 79.99),
(11, 9, 1, 89.99, 89.99),
(12, 2, 1, 699.99, 699.99),
(13, 3, 1, 449.99, 449.99),
(14, 10, 1, 129.99, 129.99),
(15, 1, 1, 999.99, 999.99), (15, 6, 1, 79.99, 79.99),
(16, 7, 1, 549.99, 549.99),
(17, 8, 2, 149.99, 299.98),
(18, 1, 1, 999.99, 999.99),
(19, 6, 1, 79.99, 79.99),
(20, 8, 1, 149.99, 149.99),
(21, 4, 1, 599.99, 599.99),
(22, 9, 1, 89.99, 89.99),
(23, 1, 1, 999.99, 999.99), (23, 7, 1, 549.99, 549.99),
(24, 10, 1, 129.99, 129.99),
(25, 5, 1, 299.99, 299.99),
(26, 3, 1, 449.99, 449.99),
(27, 6, 1, 79.99, 79.99),
(28, 7, 1, 549.99, 549.99),
(29, 8, 1, 149.99, 149.99), (29, 6, 1, 79.99, 79.99),
(30, 2, 1, 699.99, 699.99);

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================
-- Run these to verify data loaded correctly:
--
-- SELECT 'src_customers' AS tbl, COUNT(*) FROM ds_source.src_customers
-- UNION ALL SELECT 'src_orders', COUNT(*) FROM ds_source.src_orders
-- UNION ALL SELECT 'src_products', COUNT(*) FROM ds_source.src_products
-- UNION ALL SELECT 'src_order_items', COUNT(*) FROM ds_source.src_order_items;
--
-- Expected: src_customers=20, src_orders=30, src_products=10, src_order_items=37

-- ============================================================
-- MAPPING GUIDE (for testing in DataShifter)
-- ============================================================
--
-- Pipeline 1: Customers → Customer Analytics
--   Source: ds_source.src_customers
--   Target: ds_target.tgt_customer_analytics
--
--   Mappings:
--     cust_id         → customer_ref
--     first_name      → full_name        (TRIM + CONCAT with ' ' + last_name)
--     email_address   → email
--     phone_number    → phone
--     date_of_birth   → birth_date       (TO_DATE — will fail for 'invalid-date')
--     country_code    → country           (DEFAULT_IF_NULL 'UNKNOWN' + UPPER)
--     signup_date     → member_since
--     loyalty_points  → points            (TO_NUMBER — will fail for 'abc' and NULL)
--     is_active       → active            (TO_STRING → custom logic)
--     (none)          → segment           (DEFAULT_IF_NULL 'STANDARD')
--
--   Filters:
--     is_active = 'true'                  (migrate only active customers)
--     country_code IS NOT NULL            (skip customers without country)
--
-- Pipeline 2: Orders → Order Summary
--   Source: ds_source.src_orders
--   Target: ds_target.tgt_order_summary
--
--   Mappings:
--     order_id        → order_ref
--     customer_id     → customer_ref
--     order_date      → order_date        (TIMESTAMP → DATE cast)
--     status          → order_status      (UPPER)
--     total_amount    → amount
--     currency        → currency_code
--     discount_pct    → discount
--     shipping_addr   → shipping_city     (SUBSTRING to extract city)
--     notes           → memo              (TRIM)
--     (none)          → source_system     (DEFAULT_IF_NULL 'LEGACY')
--
--   Filters:
--     status NOT IN ('CANCELLED')         (skip cancelled orders)
--     total_amount > 50                   (skip tiny orders)