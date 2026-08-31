-- 007_add_client_information.sql
-- Client/owner contact details, distinct from the existing free-text
-- `client_owner` field used elsewhere. Only client_name is required by
-- the form; the rest are optional general-info fields.

ALTER TABLE submissions
    ADD COLUMN IF NOT EXISTS client_name           VARCHAR(200),
    ADD COLUMN IF NOT EXISTS client_address         VARCHAR(400),
    ADD COLUMN IF NOT EXISTS client_contact_number   VARCHAR(30),
    ADD COLUMN IF NOT EXISTS client_email            VARCHAR(320);