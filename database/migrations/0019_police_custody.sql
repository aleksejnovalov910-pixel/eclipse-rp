CREATE TABLE IF NOT EXISTS police_custody (
  character_id INTEGER PRIMARY KEY REFERENCES characters(id) ON DELETE CASCADE,
  restrained BOOLEAN NOT NULL DEFAULT FALSE,
  jailed_until TIMESTAMPTZ NULL,
  jail_reason VARCHAR(220) NULL,
  jailed_by_character_id INTEGER NULL REFERENCES characters(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_police_custody_jailed_until ON police_custody(jailed_until) WHERE jailed_until IS NOT NULL;
