-- Up Migration: Create test_results table

CREATE TYPE step_status AS ENUM ('passed', 'failed', 'skipped', 'error');

CREATE TABLE test_results (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id            UUID NOT NULL REFERENCES test_executions(id) ON DELETE CASCADE,
    step_number             INTEGER NOT NULL,
    step_name               VARCHAR(512) NOT NULL,
    status                  step_status NOT NULL,
    duration_ms             INTEGER,
    screenshot_blob_path    VARCHAR(1024),
    trace_blob_path         VARCHAR(1024),
    error_details           TEXT,
    expected_value          TEXT,
    actual_value            TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(execution_id, step_number)
);

CREATE INDEX idx_test_results_execution_id ON test_results (execution_id);
CREATE INDEX idx_test_results_status ON test_results (status);
