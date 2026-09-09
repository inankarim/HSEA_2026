-- 015_create_admin_audit_log.sql
-- Append-only audit trail of admin actions. Since 10 people share access
-- to applicant PII/documents, every view/download is attributed to the
-- specific admin_users.id who performed it — never anonymous, never
-- deduped, one row per action.

CREATE TABLE IF NOT EXISTS admin_audit_log (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    admin_id            UUID NOT NULL
        REFERENCES admin_users (id) ON DELETE CASCADE,

    action              VARCHAR(50) NOT NULL
        CHECK (action IN ('LOGIN', 'VIEW_SUBMISSION', 'DOWNLOAD_ZIP')),

    application_id      VARCHAR(20),

    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin_id
    ON admin_audit_log (admin_id, created_at);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_application_id
    ON admin_audit_log (application_id);