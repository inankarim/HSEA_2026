-- 003_create_universities.sql
-- Approved university email domains, imported via scripts/import-universities.js.
-- No domains are invented by the application; this list is seeded from an
-- authoritative source supplied separately by the competition organizers.

CREATE TABLE IF NOT EXISTS universities (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    university_name     VARCHAR(200) NOT NULL,
    email_domain        VARCHAR(150) NOT NULL,
    status              VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_universities_domain
    ON universities (LOWER(email_domain));
