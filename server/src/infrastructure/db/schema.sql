-- PostgreSQL schema generated from the provided ERD.
-- Notes:
-- - Uses plural table names to avoid reserved words (e.g., "user").
-- - Uses PostgreSQL enums for ERD "ENUM" fields. Adjust enum values as your app defines them.
-- - Uses BIGINT identity columns for *_id INT PKs.

BEGIN;

-- =========
-- Enums
-- =========
DO $$ BEGIN
  CREATE TYPE order_status AS ENUM ('pending', 'paid', 'processing', 'shipped', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE order_type AS ENUM ('individual', 'group');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE apparel_type AS ENUM ('shirt', 'jersey', 'hoodie', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_type AS ENUM ('full', 'partial');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM ('gcash', 'bank_transfer', 'cash', 'card', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE proof_status AS ENUM ('submitted', 'reviewing', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE size_enum AS ENUM ('XS','S','M','L','XL','XXL','XXXL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- =========
-- Core tables
-- =========
CREATE TABLE IF NOT EXISTS roles (
  role_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  role_name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS users (
  user_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  firstname VARCHAR(100) NOT NULL,
  lastname  VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone_number VARCHAR(30),
  password_hash VARCHAR(255) NOT NULL,
  role_id BIGINT REFERENCES roles(role_id),
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  otp_code VARCHAR(20),
  otp_expiry TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  product_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_name VARCHAR(255) NOT NULL,
  apparel_type apparel_type NOT NULL,
  base_price NUMERIC(12,2) NOT NULL,
  image_path VARCHAR(500),
  stock_status BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
  payment_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  amount_paid NUMERIC(12,2) NOT NULL,
  payment_type payment_type NOT NULL,
  payment_method payment_method NOT NULL,
  receipt_path VARCHAR(500),
  is_verified BOOLEAN NOT NULL DEFAULT FALSE
);

-- =========
-- Orders + items
-- =========
CREATE TABLE IF NOT EXISTS orders (
  order_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(user_id),
  payment_id BIGINT REFERENCES payments(payment_id),
  status order_status NOT NULL DEFAULT 'pending',
  order_type order_type NOT NULL,
  base_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  shipping_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
  tracking_number VARCHAR(100),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
  order_item_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,

  -- ERD shows product_id as VARCHAR, but products.product_id is INT.
  -- We follow products.product_id type to keep FK valid.
  product_id BIGINT NOT NULL REFERENCES products(product_id),

  quantity INTEGER NOT NULL CHECK (quantity > 0),
  total_amount NUMERIC(12,2) NOT NULL
);

-- =========
-- Design proofs (per order item)
-- =========
CREATE TABLE IF NOT EXISTS design_proofs (
  proof_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_item_id BIGINT NOT NULL REFERENCES order_items(order_item_id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  proof_file_path VARCHAR(500) NOT NULL,
  proof_status proof_status NOT NULL DEFAULT 'submitted',
  revision_note TEXT
);

-- =========
-- Roster details (group orders, per order item)
-- =========
CREATE TABLE IF NOT EXISTS roster_details (
  roster_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_item_id BIGINT NOT NULL REFERENCES order_items(order_item_id) ON DELETE CASCADE,
  team_name VARCHAR(255),
  player_name VARCHAR(255),
  jersey_number VARCHAR(20),
  size size_enum,
  logo VARCHAR(500)
);

COMMIT;
