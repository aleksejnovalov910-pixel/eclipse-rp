CREATE TABLE IF NOT EXISTS family_audit_log (
  id BIGSERIAL PRIMARY KEY,
  family_id BIGINT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  actor_character_id INTEGER REFERENCES characters(id) ON DELETE SET NULL,
  target_character_id INTEGER REFERENCES characters(id) ON DELETE SET NULL,
  action VARCHAR(48) NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS family_audit_family_created_idx ON family_audit_log(family_id,created_at DESC);
