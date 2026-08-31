-- 005_create_idempotency_keys.sql
-- Shared, database-backed idempotency store for POST /submissions/:id/submit.
-- Deliberately NOT kept in Node.js process memory, since multiple API
-- instances may handle retried requests for the same Idempotency-Key.

CREATE TABLE IF NOT EXISTS idempotency_keys (
    idempotency_key     VARCHAR(200) NOT NULL,
    application_id      VARCHAR(20) NOT NULL,
    response_status      SMALLINT,
    response_body        JSONB,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (idempotency_key, application_id)
);

CREATE INDEX IF NOT EXISTS idx_idempotency_created_at
    ON idempotency_keys (created_at);
