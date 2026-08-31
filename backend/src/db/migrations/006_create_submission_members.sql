-- 006_create_submission_members.sql
-- Team members attached to a submission. A submission always has at least
-- a primary applicant (still stored on `submissions` itself as the
-- team leader / point of contact); this table holds *additional* members.
-- Linked via application_id (the public identifier), consistent with how
-- the rest of the schema references submissions.

CREATE TABLE IF NOT EXISTS submission_members (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    application_id          VARCHAR(20) NOT NULL
        REFERENCES submissions (application_id) ON DELETE CASCADE,

    full_name               VARCHAR(200) NOT NULL,
    position                VARCHAR(150),
    phone                   VARCHAR(30),
    email                   VARCHAR(320),
    iab_membership_number   VARCHAR(50),

    is_team_leader          BOOLEAN NOT NULL DEFAULT FALSE,
    display_order           SMALLINT NOT NULL DEFAULT 0,

    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_submission_members_application_id
    ON submission_members (application_id);

-- At most one team leader per submission.
CREATE UNIQUE INDEX IF NOT EXISTS idx_submission_members_one_leader
    ON submission_members (application_id)
    WHERE is_team_leader = TRUE;