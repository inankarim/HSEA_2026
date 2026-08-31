-- 009_add_applicant_team_leader.sql
-- The primary applicant can themselves be the team leader, rather than
-- always requiring a separate row in submission_members. Only one of
-- {applicant, a member} may be the leader at a time — enforced in the
-- application layer alongside the existing partial unique index on
-- submission_members.

ALTER TABLE submissions
    ADD COLUMN IF NOT EXISTS applicant_is_team_leader BOOLEAN NOT NULL DEFAULT FALSE;