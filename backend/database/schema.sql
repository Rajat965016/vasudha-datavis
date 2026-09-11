-- ---------------------------------------------------------------------------
-- Vasudha Climate, Energy & Power data platform — PostgreSQL schema
-- ---------------------------------------------------------------------------
-- The application creates these tables automatically on boot (DB_SYNC=true),
-- so running this file is optional. It is provided so the relational design is
-- reviewable at a glance, and so the schema can be applied by hand on a
-- provider that does not allow the app to create tables.
--
--   psql "<DATABASE_URL>" -f database/schema.sql
--
-- Target: PostgreSQL 14+
-- ---------------------------------------------------------------------------

-- Custom ENUM types
DO $$ BEGIN
  CREATE TYPE enum_users_role AS ENUM ('SUPER_ADMIN', 'ADMIN');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE enum_datasets_domain AS ENUM ('CLIMATE', 'ENERGY', 'POWER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE enum_datasets_chart_type AS ENUM ('MAP_POINTS', 'STATE_HEATMAP', 'TIME_SERIES');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE enum_datasets_chart_variant AS ENUM ('LINE', 'BAR', 'AREA');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE enum_datasets_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ---------------------------------------------------------------------------
-- users — Super Admin and Admin accounts
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id                          SERIAL PRIMARY KEY,
  name                        VARCHAR(120) NOT NULL,
  email                       VARCHAR(190) NOT NULL UNIQUE,
  password_hash               VARCHAR(255) NOT NULL,
  role                        enum_users_role NOT NULL DEFAULT 'ADMIN',
  is_active                   BOOLEAN NOT NULL DEFAULT TRUE,
  must_change_password        BOOLEAN NOT NULL DEFAULT FALSE,
  last_login_at               TIMESTAMPTZ NULL,
  created_by_id               INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
  reset_password_token_hash   CHAR(64) NULL,
  reset_password_expires_at   TIMESTAMPTZ NULL,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_users_role ON users(role);
CREATE INDEX IF NOT EXISTS ix_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS ix_users_reset_token ON users(reset_password_token_hash);

-- ---------------------------------------------------------------------------
-- datasets — one uploaded CSV plus its visualisation configuration
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS datasets (
  id                SERIAL PRIMARY KEY,
  title             VARCHAR(160) NOT NULL,
  description       VARCHAR(1000) NOT NULL DEFAULT '',
  domain            enum_datasets_domain NOT NULL,
  chart_type        enum_datasets_chart_type NOT NULL,
  chart_variant     enum_datasets_chart_variant NULL DEFAULT NULL,
  value_unit        VARCHAR(32) NOT NULL DEFAULT '',
  columns           JSON NOT NULL,
  row_count         INTEGER NOT NULL DEFAULT 0,
  source_file_name  VARCHAR(255) NOT NULL DEFAULT '',
  status            enum_datasets_status NOT NULL DEFAULT 'PENDING',
  rejection_reason  VARCHAR(500) NOT NULL DEFAULT '',
  created_by_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  updated_by_id     INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
  reviewed_by_id    INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at       TIMESTAMPTZ NULL,
  published_at      TIMESTAMPTZ NULL,
  publish_sequence  INTEGER NULL UNIQUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_datasets_status_sequence ON datasets(status, publish_sequence);
CREATE INDEX IF NOT EXISTS ix_datasets_status_domain_sequence ON datasets(status, domain, publish_sequence);
CREATE INDEX IF NOT EXISTS ix_datasets_created_by ON datasets(created_by_id);

-- ---------------------------------------------------------------------------
-- dataset_rows — the validated rows of each CSV
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dataset_rows (
  id          BIGSERIAL PRIMARY KEY,
  dataset_id  INTEGER NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  row_index   INTEGER NOT NULL,
  payload     JSON NOT NULL,
  CONSTRAINT uq_dataset_rows_dataset_index UNIQUE (dataset_id, row_index)
);

-- ---------------------------------------------------------------------------
-- counters — atomic named sequences
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS counters (
  name  VARCHAR(64) PRIMARY KEY,
  value INTEGER NOT NULL DEFAULT 0
);
