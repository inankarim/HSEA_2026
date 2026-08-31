-- 012_add_team_member_documents.sql
-- Extends submission_documents to support documents per team member (NID, photo).
-- Existing application-wide documents (OWNER_AUTHORIZATION, DESIGN_DEMONSTRATION, etc)
-- continue to have NULL submission_member_id. Team member docs reference a specific member.

ALTER TABLE submission_documents
    ADD COLUMN submission_member_id UUID DEFAULT NULL
        REFERENCES submission_members (id) ON DELETE CASCADE;

-- Drop the old unique constraint that only considers (application_id, document_type)
DROP INDEX IF EXISTS idx_submission_documents_app_type;

-- New unique constraint: per application + document type + optional member
-- Multiple members can each have their own NID/PHOTO because member_id differs.
-- Application-wide docs (member_id IS NULL) can still only have one per type.
CREATE UNIQUE INDEX idx_submission_documents_app_type_member
    ON submission_documents (application_id, document_type, submission_member_id)
    WHERE submission_member_id IS NOT NULL;

CREATE UNIQUE INDEX idx_submission_documents_app_type_global
    ON submission_documents (application_id, document_type)
    WHERE submission_member_id IS NULL;

-- Keep the application_id index for listing
CREATE INDEX IF NOT EXISTS idx_submission_documents_application_id
    ON submission_documents (application_id);

-- Index for querying a member's documents
CREATE INDEX IF NOT EXISTS idx_submission_documents_member_id
    ON submission_documents (submission_member_id);