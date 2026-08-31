-- 001_create_users.sql
-- Registered applicant accounts. Guest submissions do not create a row here.


CREATE TABLE IF NOT EXISTS users (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    full_name               VARCHAR(200) NOT NULL,
    email                   VARCHAR(320) NOT NULL,
    phone                   VARCHAR(30),
    password_hash           VARCHAR(255) NOT NULL,
    organization            VARCHAR(200),
    designation             VARCHAR(150),

    applicant_type          VARCHAR(20) NOT NULL
        CHECK (applicant_type IN ('IAB_MEMBER', 'STUDENT')),

    iab_membership_number   VARCHAR(50),
    university_name         VARCHAR(200),
    university_email        VARCHAR(320),

    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Emails are normalized to lowercase by the application layer before
-- insert/lookup; the unique index enforces case-insensitive uniqueness
-- regardless, as defense in depth.
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower
    ON users (LOWER(email));

CREATE INDEX IF NOT EXISTS idx_users_created_at ON users (created_at);
