-- ---------------------------------------------------------------------------
-- Vasudha Climate, Energy & Power data platform — MySQL schema
-- ---------------------------------------------------------------------------
-- The application creates these tables automatically on boot (DB_SYNC=true),
-- so running this file is optional. It is provided so the relational design is
-- reviewable at a glance, and so the schema can be applied by hand on a
-- provider that does not allow the app to create tables.
--
--   mysql -u <user> -p <database> < database/schema.sql
--
-- Target: MySQL 8.0+ (also runs on MariaDB 10.5+).
-- ---------------------------------------------------------------------------

SET NAMES utf8mb4;

-- ---------------------------------------------------------------------------
-- users — Super Admin and Admin accounts
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id`                          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`                        VARCHAR(120)  NOT NULL,
  -- 190 keeps the UNIQUE index inside the utf8mb4 key-length limit.
  `email`                       VARCHAR(190)  NOT NULL,
  `password_hash`               VARCHAR(255)  NOT NULL,
  `role`                        ENUM('SUPER_ADMIN','ADMIN') NOT NULL DEFAULT 'ADMIN',
  `is_active`                   TINYINT(1)    NOT NULL DEFAULT 1,
  -- Set when the Super Admin issues a temporary password.
  `must_change_password`        TINYINT(1)    NOT NULL DEFAULT 0,
  `last_login_at`               DATETIME      NULL DEFAULT NULL,
  `created_by_id`               INT UNSIGNED  NULL DEFAULT NULL,
  -- Only the SHA-256 hash of a reset token is stored, never the token itself.
  `reset_password_token_hash`   CHAR(64)      NULL DEFAULT NULL,
  `reset_password_expires_at`   DATETIME      NULL DEFAULT NULL,
  `created_at`                  DATETIME      NOT NULL,
  `updated_at`                  DATETIME      NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_email` (`email`),
  KEY `ix_users_role` (`role`),
  KEY `ix_users_is_active` (`is_active`),
  KEY `ix_users_reset_token` (`reset_password_token_hash`),
  CONSTRAINT `fk_users_created_by`
    FOREIGN KEY (`created_by_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- datasets — one uploaded CSV plus its visualisation configuration
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `datasets` (
  `id`                INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `title`             VARCHAR(160)  NOT NULL,
  `description`       VARCHAR(1000) NOT NULL DEFAULT '',
  `domain`            ENUM('CLIMATE','ENERGY','POWER') NOT NULL,
  `chart_type`        ENUM('MAP_POINTS','STATE_HEATMAP','TIME_SERIES') NOT NULL,
  -- Only meaningful for TIME_SERIES datasets.
  `chart_variant`     ENUM('LINE','BAR','AREA') NULL DEFAULT NULL,
  `value_unit`        VARCHAR(32)   NOT NULL DEFAULT '',
  -- Column metadata (key, source header, label, type, role) for the uploaded
  -- CSV. JSON because the set of columns differs per chart type.
  `columns`           JSON          NOT NULL,
  `row_count`         INT UNSIGNED  NOT NULL DEFAULT 0,
  `source_file_name`  VARCHAR(255)  NOT NULL DEFAULT '',
  `status`            ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
  `rejection_reason`  VARCHAR(500)  NOT NULL DEFAULT '',
  `created_by_id`     INT UNSIGNED  NOT NULL,
  `updated_by_id`     INT UNSIGNED  NULL DEFAULT NULL,
  `reviewed_by_id`    INT UNSIGNED  NULL DEFAULT NULL,
  `reviewed_at`       DATETIME      NULL DEFAULT NULL,
  `published_at`      DATETIME      NULL DEFAULT NULL,
  -- Allocated on first approval. The public landing page orders by this
  -- column, so charts appear in the sequence they were approved.
  `publish_sequence`  INT UNSIGNED  NULL DEFAULT NULL,
  `created_at`        DATETIME      NOT NULL,
  `updated_at`        DATETIME      NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_datasets_publish_sequence` (`publish_sequence`),
  KEY `ix_datasets_status_sequence` (`status`, `publish_sequence`),
  KEY `ix_datasets_status_domain_sequence` (`status`, `domain`, `publish_sequence`),
  KEY `ix_datasets_created_by` (`created_by_id`),
  -- Authorship is part of the audit trail: an Admin who still owns datasets
  -- cannot be deleted, only disabled.
  CONSTRAINT `fk_datasets_created_by`
    FOREIGN KEY (`created_by_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_datasets_updated_by`
    FOREIGN KEY (`updated_by_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_datasets_reviewed_by`
    FOREIGN KEY (`reviewed_by_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- dataset_rows — the validated rows of each CSV
-- ---------------------------------------------------------------------------
-- Kept in their own table so dashboard queries never read the data, deletes
-- cascade, and a dataset is not limited by a single row's size. The per-row
-- values stay in JSON because each chart type has a different set of columns —
-- `datasets.columns` describes what is inside.
CREATE TABLE IF NOT EXISTS `dataset_rows` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `dataset_id`  INT UNSIGNED    NOT NULL,
  -- Preserves upload order (chronological for time series).
  `row_index`   INT UNSIGNED    NOT NULL,
  `payload`     JSON            NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_dataset_rows_dataset_index` (`dataset_id`, `row_index`),
  CONSTRAINT `fk_dataset_rows_dataset`
    FOREIGN KEY (`dataset_id`) REFERENCES `datasets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- counters — atomic named sequences
-- ---------------------------------------------------------------------------
-- Allocates datasets.publish_sequence. The row is locked inside a transaction
-- (SELECT … FOR UPDATE) so two simultaneous approvals can never be given the
-- same position on the public landing page.
CREATE TABLE IF NOT EXISTS `counters` (
  `name`  VARCHAR(64)  NOT NULL,
  `value` INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
