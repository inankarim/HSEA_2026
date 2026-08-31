-- 002_create_iab_members.sql
-- Approved IAB membership records, imported via scripts/import-iab-members.js.
-- No fake/production membership data is seeded by migrations.

CREATE TABLE IF NOT EXISTS iab_members (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    iab_membership_number   VARCHAR(50) NOT NULL,
    member_name             VARCHAR(200) NOT NULL,
    status                  VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_iab_members_number
    ON iab_members (iab_membership_number);
