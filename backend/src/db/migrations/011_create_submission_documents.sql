-- 011_create_submission_documents.sql
-- Metadata for applicant-uploaded documents (NID, photos, drawings, etc).
-- The binary file itself lives on local/on-premise disk under STORAGE_ROOT
-- (see src/storage/LocalFileStorage.js) at a server-generated path — this
-- table never stores file bytes, only what's needed to locate, validate
-- ownership of, and display status for each uploaded file.

CREATE TABLE IF NOT EXISTS submission_documents (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    application_id      VARCHAR(20) NOT NULL
        REFERENCES submissions (application_id) ON DELETE CASCADE,

    document_type       VARCHAR(50) NOT NULL
        CHECK (document_type IN (
            'APPLICANT_NID', 'APPLICANT_PHOTO', 'ENGINEER_PHOTO',
            'OWNER_AUTHORIZATION', 'DESIGN_DEMONSTRATION', 'COSTING',
            'SUSTAINABILITY_METRICS', 'PROJECT_DESCRIPTION',
            'EXECUTIVE_SUMMARY', 'ARCHITECTURAL_DRAWINGS'
        )),

    original_filename   VARCHAR(255) NOT NULL,
    stored_filename     VARCHAR(255) NOT NULL,
    mime_type           VARCHAR(100) NOT NULL,
    file_size           INTEGER NOT NULL CHECK (file_size > 0 AND file_size <= 2097152),
    sha256_checksum     VARCHAR(64) NOT NULL,

    -- Path relative to STORAGE_ROOT, e.g.
    -- "applicants/HSEA26-8F42KQ/APPLICANT_NID.<uuid>.pdf" — never an
    -- absolute filesystem path, and never served directly to clients.
    storage_path        VARCHAR(500) NOT NULL,

    upload_status       VARCHAR(20) NOT NULL DEFAULT 'UPLOADED'
        CHECK (upload_status IN ('UPLOADING', 'UPLOADED', 'FAILED')),

    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One document per (application, type): re-uploading replaces the row in
-- place via ON CONFLICT (application_id, document_type) DO UPDATE in
-- document.service.js — never produces a second row for the same slot.
CREATE UNIQUE INDEX IF NOT EXISTS idx_submission_documents_app_type
    ON submission_documents (application_id, document_type);

CREATE INDEX IF NOT EXISTS idx_submission_documents_application_id
    ON submission_documents (application_id);