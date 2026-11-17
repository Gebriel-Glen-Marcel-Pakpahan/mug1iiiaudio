-- ============================================================
-- MUG1III AUDIO ARCHIVE - POSTGRESQL PRODUCTION SCHEMA
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  avatar_url TEXT,
  password_hash VARCHAR(255),
  role VARCHAR(32) NOT NULL DEFAULT 'BUYER',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS albums (
  id VARCHAR(64) PRIMARY KEY,
  slug VARCHAR(255) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  artist VARCHAR(255) NOT NULL,
  genre VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  cover_palette JSONB NOT NULL,
  cover_mark VARCHAR(64) NOT NULL,
  price INTEGER NOT NULL,
  format VARCHAR(32) NOT NULL DEFAULT 'FLAC',
  sample_rate VARCHAR(64) NOT NULL,
  bit_depth VARCHAR(32) NOT NULL,
  total_size_mb INTEGER NOT NULL,
  track_count INTEGER NOT NULL,
  total_duration VARCHAR(32) NOT NULL,
  tracklist JSONB NOT NULL,
  preview_url TEXT,
  gdrive_folder_id VARCHAR(128) NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  year INTEGER NOT NULL,
  label VARCHAR(255) NOT NULL,
  catalogue_no VARCHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cart_items (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  album_id VARCHAR(64) NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_user_album_cart UNIQUE (user_id, album_id)
);

CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(64) PRIMARY KEY,
  order_number VARCHAR(64) UNIQUE NOT NULL,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total_amount INTEGER NOT NULL,
  tax_amount INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  payment_status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  access_status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS order_items (
  id VARCHAR(64) PRIMARY KEY,
  order_id VARCHAR(64) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  album_id VARCHAR(64) NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
  price_snapshot INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS payments (
  id VARCHAR(64) PRIMARY KEY,
  order_id VARCHAR(64) UNIQUE NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  gateway VARCHAR(64) NOT NULL DEFAULT 'midtrans',
  gateway_ref VARCHAR(128),
  qr_string TEXT,
  amount INTEGER NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  raw_payload JSONB,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS drive_links (
  id VARCHAR(64) PRIMARY KEY,
  order_id VARCHAR(64) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  album_id VARCHAR(64) NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
  folder_id VARCHAR(128) NOT NULL,
  permission_id VARCHAR(128) NOT NULL,
  link_url TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS refunds (
  id VARCHAR(64) PRIMARY KEY,
  order_id VARCHAR(64) UNIQUE NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'REQUESTED',
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by VARCHAR(255),
  resolution_note TEXT
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(64) PRIMARY KEY,
  at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor VARCHAR(255) NOT NULL,
  action VARCHAR(128) NOT NULL,
  target VARCHAR(255) NOT NULL,
  detail TEXT NOT NULL,
  level VARCHAR(32) NOT NULL DEFAULT 'info'
);

CREATE TABLE IF NOT EXISTS album_requests (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  user_email VARCHAR(255) NOT NULL,
  user_contact VARCHAR(128),
  album_title VARCHAR(255) NOT NULL,
  artist VARCHAR(255) NOT NULL,
  year VARCHAR(64),
  format_preference VARCHAR(100),
  notes TEXT,
  status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indices for high performance queries
CREATE INDEX IF NOT EXISTS idx_albums_slug ON albums(slug);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_drive_links_order ON drive_links(order_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_user ON cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON album_requests(status);
CREATE INDEX IF NOT EXISTS idx_audit_at ON audit_logs(at DESC);
