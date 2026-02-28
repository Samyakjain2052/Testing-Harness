-- Up Migration: Create test_scripts table

CREATE TABLE test_scripts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id          UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    blob_path       VARCHAR(1024) NOT NULL,
    file_size_bytes INTEGER,
    content_hash    VARCHAR(64),
    tags            TEXT[] DEFAULT '{}',
    is_archived     BOOLEAN NOT NULL DEFAULT false,
    created_by      UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_test_scripts_app_id ON test_scripts (app_id);
CREATE INDEX idx_test_scripts_created_by ON test_scripts (created_by);
CREATE INDEX idx_test_scripts_tags ON test_scripts USING GIN (tags);
