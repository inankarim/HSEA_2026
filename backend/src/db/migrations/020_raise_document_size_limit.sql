-- 020_raise_document_size_limit.sql
-- Uploads are now capped at 5MB (was 2MB); keep the database backstop in
-- step with config/documentType.js MAX_DOCUMENT_SIZE_BYTES.
ALTER TABLE submission_documents
    DROP CONSTRAINT IF EXISTS submission_documents_file_size_check;
ALTER TABLE submission_documents
    ADD CONSTRAINT submission_documents_file_size_check
    CHECK (file_size > 0 AND file_size <= 5242880);
