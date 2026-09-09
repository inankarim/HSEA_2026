-- 014_create_admin_users.sql
-- Admin accounts for the hidden review panel (domain/123456789/admin).
-- Up to 10 named accounts, created manually via scripts/create-admin-users.js
-- — no public registration endpoint exists for this table. Separate entirely
-- from the applicant-facing `users` table so an applicant session can never
-- satisfy admin auth.

CREATE TABLE IF NOT EXISTS admin_users (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    email                   VARCHAR(320) NOT NULL,
    password_hash           VARCHAR(255) NOT NULL,
    full_name               VARCHAR(200) NOT NULL,

    -- Forces a password reset on first login since initial passwords are
    -- randomly generated and shared out-of-band (see seed script).
    must_change_password    BOOLEAN NOT NULL DEFAULT TRUE,

    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_users_email_lower
    ON admin_users (LOWER(email));