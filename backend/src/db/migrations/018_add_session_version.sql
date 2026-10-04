-- 018_add_session_version.sql
-- Supports single-session enforcement: every issued JWT embeds the
-- account's session_version at signing time. Bumping this column
-- server-side (on new login, logout, or password change) immediately
-- invalidates every token signed with the old value, regardless of its
-- own expiry — fixes "multiple concurrent sessions allowed, server-side
-- session invalidation not enforced" (VAPT 3.5).
ALTER TABLE users ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 1;
