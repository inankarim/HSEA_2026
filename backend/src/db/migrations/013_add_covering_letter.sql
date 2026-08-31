-- 013_add_covering_letter.sql
-- Adds the Covering Letter field. Like Executive Summary / Project
-- Description / Design Demonstration / Costing, this is an "either/or"
-- field: satisfied by EITHER this text column OR an uploaded
-- COVERING_LETTER PDF (see config/documentTypes.js orTextField pattern).

ALTER TABLE submissions
    ADD COLUMN IF NOT EXISTS covering_letter TEXT;

-- Widen submission_documents.document_type to allow 'COVERING_LETTER'.
-- The constraint name below matches the one Postgres auto-generates for
-- the inline CHECK defined in 011_create_submission_documents.sql
-- ("<table>_<column>_check"). If your database ended up with a different
-- generated name, adjust the DROP CONSTRAINT line to match (you can find
-- it with: \d submission_documents in psql).
ALTER TABLE submission_documents
    DROP CONSTRAINT IF EXISTS submission_documents_document_type_check;

ALTER TABLE submission_documents
    ADD CONSTRAINT submission_documents_document_type_check
    CHECK (document_type IN (
        'APPLICANT_NID', 'APPLICANT_PHOTO', 'ENGINEER_PHOTO',
        'OWNER_AUTHORIZATION', 'DESIGN_DEMONSTRATION', 'COSTING',
        'SUSTAINABILITY_METRICS', 'PROJECT_DESCRIPTION',
        'EXECUTIVE_SUMMARY', 'ARCHITECTURAL_DRAWINGS', 'COVERING_LETTER'
    ));