-- 016_extend_admin_audit_log.sql
-- Generalizes admin_audit_log beyond submission-scoped actions. Deleting a
-- user or another admin has no application_id, so target_type/target_id
-- cover those cases generically while application_id keeps working as-is
-- for existing submission-related log entries.
ALTER TABLE admin_audit_log
    ADD COLUMN IF NOT EXISTS target_type VARCHAR(30),
    ADD COLUMN IF NOT EXISTS target_id VARCHAR(100);

-- If admin_audit_log.admin_id has a FK to admin_users with no ON DELETE
-- rule, deleting an admin who has audit log rows (nearly every admin,
-- once they've logged in) would fail with a FK violation. Recreate that
-- constraint with ON DELETE SET NULL so history is preserved instead of
-- blocking deletion.
DO $$
DECLARE
  fk_name text;
BEGIN
  SELECT tc.constraint_name INTO fk_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
  WHERE tc.table_name = 'admin_audit_log'
    AND kcu.column_name = 'admin_id'
    AND tc.constraint_type = 'FOREIGN KEY';

  IF fk_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE admin_audit_log DROP CONSTRAINT %I', fk_name);
  END IF;

  ALTER TABLE admin_audit_log ALTER COLUMN admin_id DROP NOT NULL;

  ALTER TABLE admin_audit_log
    ADD CONSTRAINT admin_audit_log_admin_id_fkey
    FOREIGN KEY (admin_id) REFERENCES admin_users(id) ON DELETE SET NULL;
END $$;