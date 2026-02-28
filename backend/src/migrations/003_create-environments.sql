-- Up Migration: Create environments table

CREATE TABLE environments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id          UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    base_url        VARCHAR(2048) NOT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    variables       JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(app_id, name)
);

CREATE INDEX idx_environments_app_id ON environments (app_id);
