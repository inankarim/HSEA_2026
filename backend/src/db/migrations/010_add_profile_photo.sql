-- 010_add_profile_photo.sql
-- Profile photo storage metadata for registered users. The binary file
-- itself lives on disk under a randomly-generated, non-guessable filename
-- (see services/pictureUpload.service.js) — this table only stores what's
-- needed to serve/replace/delete it. No raw file bytes ever go into the
-- database.

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS profile_photo_path        VARCHAR(500),
    ADD COLUMN IF NOT EXISTS profile_photo_url          VARCHAR(500),
    ADD COLUMN IF NOT EXISTS profile_photo_mime_type    VARCHAR(50),
    ADD COLUMN IF NOT EXISTS profile_photo_size_bytes   INTEGER,
    ADD COLUMN IF NOT EXISTS profile_photo_checksum     VARCHAR(64),
    ADD COLUMN IF NOT EXISTS profile_photo_uploaded_at  TIMESTAMPTZ;

-- Lets us cheaply query/report on who has uploaded a photo and when,
-- without a full table scan.
CREATE INDEX IF NOT EXISTS idx_users_profile_photo_uploaded_at
    ON users (profile_photo_uploaded_at);
