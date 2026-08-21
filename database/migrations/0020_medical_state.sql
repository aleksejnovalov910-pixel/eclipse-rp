CREATE TABLE IF NOT EXISTS character_medical_state (
  character_id BIGINT PRIMARY KEY REFERENCES characters(id) ON DELETE CASCADE,
  downed BOOLEAN NOT NULL DEFAULT FALSE,
  downed_at TIMESTAMPTZ NULL,
  bleedout_at TIMESTAMPTZ NULL,
  hospitalized_until TIMESTAMPTZ NULL,
  last_cause VARCHAR(120) NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS character_medical_state_bleedout_idx ON character_medical_state(bleedout_at) WHERE downed = TRUE;
