-- 004_create_submissions.sql
-- The core competition submission record. `application_id` is the public
-- identifier; `id` is internal only and is never exposed to clients.

CREATE TABLE IF NOT EXISTS submissions (
    id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id                  VARCHAR(20) NOT NULL,

    user_id                         UUID REFERENCES users(id) ON DELETE SET NULL,

    -- A random, unguessable token that lets guest applicants retrieve and
    -- edit their own draft without an account. Never returned in list
    -- endpoints — only issued once, at creation, directly to the applicant.
    guest_access_token_hash         VARCHAR(255),

    applicant_type                  VARCHAR(20) NOT NULL
        CHECK (applicant_type IN ('IAB_MEMBER', 'STUDENT')),

    full_name                       VARCHAR(200),
    email                           VARCHAR(320),
    phone                           VARCHAR(30),
    organization                    VARCHAR(200),
    designation                     VARCHAR(150),

    iab_membership_number           VARCHAR(50),
    iab_verification_status         VARCHAR(20) NOT NULL DEFAULT 'NOT_APPLICABLE'
        CHECK (iab_verification_status IN
            ('NOT_APPLICABLE', 'PENDING', 'VERIFIED', 'FAILED')),

    university_name                 VARCHAR(200),
    university_email                VARCHAR(320),
    university_verification_status  VARCHAR(20) NOT NULL DEFAULT 'NOT_APPLICABLE'
        CHECK (university_verification_status IN
            ('NOT_APPLICABLE', 'PENDING', 'VERIFIED', 'FAILED')),

    project_name                    VARCHAR(250),
    project_category                VARCHAR(100),
    project_location                VARCHAR(250),
    project_status                  VARCHAR(50),
    client_owner                    VARCHAR(250),
    lead_engineer                   VARCHAR(200),
    completion_year                 SMALLINT,

    executive_summary               TEXT,
    project_description             TEXT,
    design_demonstration            TEXT,
    material_specifications         TEXT,
    construction_technology         TEXT,
    costing                         TEXT,

    google_drive_url                VARCHAR(2048),

    information_confirmed           BOOLEAN NOT NULL DEFAULT FALSE,
    files_uploaded_confirmed        BOOLEAN NOT NULL DEFAULT FALSE,
    naming_convention_confirmed     BOOLEAN NOT NULL DEFAULT FALSE,
    authenticity_confirmed          BOOLEAN NOT NULL DEFAULT FALSE,
    terms_accepted                  BOOLEAN NOT NULL DEFAULT FALSE,

    status                          VARCHAR(20) NOT NULL DEFAULT 'DRAFT'
        CHECK (status IN (
            'DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'SHORTLISTED',
            'FINALIST', 'WINNER', 'REJECTED'
        )),

    created_at                      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                      TIMESTAMPTZ NOT NULL DEFAULT now(),
    submitted_at                    TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_submissions_application_id
    ON submissions (application_id);

CREATE INDEX IF NOT EXISTS idx_submissions_user_id ON submissions (user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_email ON submissions (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_submissions_iab_number
    ON submissions (iab_membership_number);
CREATE INDEX IF NOT EXISTS idx_submissions_university_email
    ON submissions (LOWER(university_email));
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions (status);
CREATE INDEX IF NOT EXISTS idx_submissions_created_at ON submissions (created_at);

-- project_name is intentionally NOT unique — two applicants may share a
-- project name; application_id is the only unique public identifier.
