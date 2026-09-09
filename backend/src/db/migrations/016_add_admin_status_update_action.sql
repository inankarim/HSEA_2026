-- 016_add_admin_status_update_action.sql
ALTER TABLE admin_audit_log
    DROP CONSTRAINT IF EXISTS admin_audit_log_action_check;

ALTER TABLE admin_audit_log
    ADD CONSTRAINT admin_audit_log_action_check
    CHECK (action IN ('LOGIN', 'VIEW_SUBMISSION', 'DOWNLOAD_ZIP', 'UPDATE_STATUS'));