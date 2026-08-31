-- 008_add_member_university_fields.sql
-- Team members can be students too, not just IAB members — mirror the
-- university fields and verification statuses already present on the
-- top-level submissions row.

ALTER TABLE submission_members
    ADD COLUMN IF NOT EXISTS applicant_type              VARCHAR(20)
        CHECK (applicant_type IN ('IAB_MEMBER', 'STUDENT')),
    ADD COLUMN IF NOT EXISTS university_name              VARCHAR(200),
    ADD COLUMN IF NOT EXISTS university_email             VARCHAR(320),
    ADD COLUMN IF NOT EXISTS iab_verification_status       VARCHAR(20) NOT NULL DEFAULT 'NOT_APPLICABLE'
        CHECK (iab_verification_status IN
            ('NOT_APPLICABLE', 'PENDING', 'VERIFIED', 'FAILED')),
    ADD COLUMN IF NOT EXISTS university_verification_status VARCHAR(20) NOT NULL DEFAULT 'NOT_APPLICABLE'
        CHECK (university_verification_status IN
            ('NOT_APPLICABLE', 'PENDING', 'VERIFIED', 'FAILED'));