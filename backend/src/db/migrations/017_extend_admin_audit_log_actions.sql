-- 017_extend_admin_audit_log_actions.sql
-- admin.service.js has been writing RESET_USER_PASSWORD, DELETE_USER, and
-- DELETE_ADMIN audit entries since 016_extend_admin_audit_log.sql added the
-- target_type/target_id columns for them, but the action CHECK constraint
-- (016_add_admin_status_update_action.sql) was never updated to allow these
-- values. Every insert for these three actions has been silently failing
-- (logAdminAction swallows the error), so password resets and account
-- deletions have not been audit-logged.
ALTER TABLE admin_audit_log
    DROP CONSTRAINT IF EXISTS admin_audit_log_action_check;

ALTER TABLE admin_audit_log
    ADD CONSTRAINT admin_audit_log_action_check
    CHECK (action IN (
        'LOGIN', 'VIEW_SUBMISSION', 'DOWNLOAD_ZIP', 'UPDATE_STATUS',
        'RESET_USER_PASSWORD', 'DELETE_USER', 'DELETE_ADMIN'
    ));
