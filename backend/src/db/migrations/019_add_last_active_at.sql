-- 019_add_last_active_at.sql
-- Supports a real idle timeout (distinct from the absolute token TTLs
-- already in place): last_active_at is refreshed on every authenticated
-- request, and a session is rejected once it's been idle longer than the
-- configured window, regardless of whether the token itself has expired.
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ NOT NULL DEFAULT now();
