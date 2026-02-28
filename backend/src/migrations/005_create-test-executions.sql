-- Up Migration: Create test_executions table

CREATE TYPE execution_status AS ENUM (
    'queued',
    'running',
    'passed',
    'failed',
    'error',
    'cancelled'
);

CREATE TABLE test_executions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    script_id       UUID NOT NULL REFERENCES test_scripts(id) ON DELETE CASCADE,
    environment_id  UUID NOT NULL REFERENCES environments(id) ON DELETE RESTRICT,
    status          execution_status NOT NULL DEFAULT 'queued',
    queue_job_id    VARCHAR(255),
    triggered_by    UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    duration_ms     INTEGER,
    error_message   TEXT,
    retry_count     INTEGER NOT NULL DEFAULT 0,
    max_retries     INTEGER NOT NULL DEFAULT 0,
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_test_executions_script_id ON test_executions (script_id);
CREATE INDEX idx_test_executions_environment_id ON test_executions (environment_id);
CREATE INDEX idx_test_executions_status ON test_executions (status);
CREATE INDEX idx_test_executions_triggered_by ON test_executions (triggered_by);
CREATE INDEX idx_test_executions_created_at ON test_executions (created_at DESC);
