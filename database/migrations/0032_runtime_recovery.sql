CREATE TABLE IF NOT EXISTS active_job_assignments (
  character_id BIGINT PRIMARY KEY REFERENCES characters(id) ON DELETE CASCADE,
  job_key VARCHAR(64) NOT NULL,
  step_index INTEGER NOT NULL DEFAULT 0 CHECK(step_index >= 0),
  state JSONB NOT NULL DEFAULT '{}'::jsonb,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS operation_receipts (
  id BIGSERIAL PRIMARY KEY,
  character_id BIGINT NULL REFERENCES characters(id) ON DELETE SET NULL,
  scope VARCHAR(64) NOT NULL,
  operation_key VARCHAR(128) NOT NULL,
  result JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NULL,
  UNIQUE(scope, operation_key)
);

CREATE INDEX IF NOT EXISTS operation_receipts_character_idx
  ON operation_receipts(character_id, created_at DESC);
CREATE INDEX IF NOT EXISTS operation_receipts_expiry_idx
  ON operation_receipts(expires_at) WHERE expires_at IS NOT NULL;
