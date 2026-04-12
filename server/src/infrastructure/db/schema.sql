-- PostgreSQL schema 
-- Notes:


BEGIN;

-- =========
-- Enums
-- =========
DO $$ BEGIN
  CREATE TYPE order_status AS ENUM ('draft', 'pending', 'paid', 'proofing', 'processing', 'awaiting_final_payment', 'ready_to_ship', 'shipped', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Add missing enum values on existing databases.

-- Allow using orders as a draft cart (cart = draft order).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_type t WHERE t.typname = 'order_status'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'order_status' AND e.enumlabel = 'draft'
  ) THEN
    ALTER TYPE order_status ADD VALUE 'draft';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_type t WHERE t.typname = 'order_status'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'order_status' AND e.enumlabel = 'proofing'
  ) THEN
    ALTER TYPE order_status ADD VALUE 'proofing';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_type t WHERE t.typname = 'order_status'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'order_status' AND e.enumlabel = 'ready_to_ship'
  ) THEN
    ALTER TYPE order_status ADD VALUE 'ready_to_ship';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_type t WHERE t.typname = 'order_status'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'order_status' AND e.enumlabel = 'awaiting_final_payment'
  ) THEN
    ALTER TYPE order_status ADD VALUE 'awaiting_final_payment';
  END IF;
END $$;

DO $$ BEGIN
  CREATE TYPE order_type AS ENUM ('individual', 'group');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Allow cart checkout to create an order with multiple item types.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'order_type' AND e.enumlabel = 'mixed'
  ) THEN
    ALTER TYPE order_type ADD VALUE 'mixed';
  END IF;
END $$;

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
  address TEXT,
  password_hash VARCHAR(255) NOT NULL,
  role_id BIGINT REFERENCES roles(role_id),
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  otp_code VARCHAR(20),
  otp_expiry TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Evolve existing databases (CREATE TABLE IF NOT EXISTS will not add new columns).
ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT;

-- =========
-- Activity logs
-- =========
CREATE TABLE IF NOT EXISTS activity_logs (
  log_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  actor_user_id BIGINT NULL REFERENCES users(user_id) ON DELETE SET NULL,
  actor_role VARCHAR(50),
  action VARCHAR(120) NOT NULL,
  description TEXT,

  ip_address INET,
  user_agent TEXT,

  meta JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs (action);

-- =========
-- Custom design requests
-- =========
CREATE TABLE IF NOT EXISTS custom_design_requests (
  request_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,

  status VARCHAR(30) NOT NULL DEFAULT 'submitted' CHECK (status IN (
    'draft',
    'submitted',
    'reviewing',
    'quoted',
    'awaiting_payment',
    'proofing',
    'processing',
    'completed',
    'cancelled'
  )),

  design_name VARCHAR(255) NOT NULL,
  product_type VARCHAR(80) NOT NULL,
  design_type VARCHAR(20) NOT NULL CHECK (design_type IN ('final','reference')),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  personalization VARCHAR(30) NOT NULL CHECK (personalization IN ('names_numbers','number_only','none')),
  payment_preference VARCHAR(20) NOT NULL CHECK (payment_preference IN ('GCash','COD')),

  notes TEXT,
  roster JSONB NOT NULL DEFAULT '[]'::jsonb,
  files JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_custom_design_requests_user_id ON custom_design_requests (user_id);
CREATE INDEX IF NOT EXISTS idx_custom_design_requests_created_at ON custom_design_requests (created_at DESC);

CREATE TABLE IF NOT EXISTS products (
  product_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_name VARCHAR(255) NOT NULL,
  apparel_type apparel_type NOT NULL,
  collection VARCHAR(80),
  base_price NUMERIC(12,2) NOT NULL,
  image_path VARCHAR(500),
  stock_status BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE products ADD COLUMN IF NOT EXISTS collection VARCHAR(80);

CREATE TABLE IF NOT EXISTS product_images (
  product_image_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
  view_type VARCHAR(20) NOT NULL CHECK (view_type IN ('front', 'back', 'lower', 'full')),
  image_path VARCHAR(500) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (product_id, view_type)
);

CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);

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
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
  order_item_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,

  -- ERD shows product_id as VARCHAR, but products.product_id is INT.
  -- We follow products.product_id type to keep FK valid.
  product_id BIGINT NOT NULL REFERENCES products(product_id),

  quantity INTEGER NOT NULL CHECK (quantity > 0),
  total_amount NUMERIC(12,2) NOT NULL,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- Link custom design requests to a created order (nullable for older rows).
ALTER TABLE custom_design_requests
  ADD COLUMN IF NOT EXISTS order_id BIGINT REFERENCES orders(order_id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_custom_design_requests_order_id ON custom_design_requests (order_id);

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
