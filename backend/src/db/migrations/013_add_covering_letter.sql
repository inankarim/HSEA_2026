-- 013_add_covering_letter.sql
ALTER TABLE submissions
    ADD COLUMN IF NOT EXISTS covering_letter TEXT;

ALTER TABLE submission_documents
    DROP CONSTRAINT IF EXISTS submission_documents_document_type_check;

ALTER TABLE submission_documents
    ADD CONSTRAINT submission_documents_document_type_check
    CHECK (document_type IN (
        'APPLICANT_NID',
        'APPLICANT_PHOTO',
        'OWNER_AUTHORIZATION',
        'DESIGN_DEMONSTRATION',
        'COSTING',
        'SUSTAINABILITY_METRICS',
        'PROJECT_DESCRIPTION',
        'EXECUTIVE_SUMMARY',
        'ARCHITECTURAL_DRAWINGS',
        'COVERING_LETTER'
    ));