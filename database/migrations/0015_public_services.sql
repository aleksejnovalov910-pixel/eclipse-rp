CREATE TABLE IF NOT EXISTS police_records (
  id BIGSERIAL PRIMARY KEY,
  target_character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  officer_character_id INTEGER REFERENCES characters(id) ON DELETE SET NULL,
  kind VARCHAR(24) NOT NULL CHECK (kind IN ('fine','wanted','note')),
  reason VARCHAR(220) NOT NULL,
  amount NUMERIC(14,2),
  wanted_level SMALLINT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  CONSTRAINT police_record_amount CHECK (amount IS NULL OR amount > 0),
  CONSTRAINT police_record_wanted CHECK (wanted_level IS NULL OR wanted_level BETWEEN 1 AND 5)
);
CREATE INDEX IF NOT EXISTS police_records_target_idx ON police_records(target_character_id,active,created_at DESC);

CREATE TABLE IF NOT EXISTS medical_records (
  id BIGSERIAL PRIMARY KEY,
  target_character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  medic_character_id INTEGER REFERENCES characters(id) ON DELETE SET NULL,
  diagnosis VARCHAR(220) NOT NULL,
  treatment VARCHAR(220) NOT NULL,
  health_before SMALLINT NOT NULL,
  health_after SMALLINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT medical_health_range CHECK (health_before BETWEEN 0 AND 100 AND health_after BETWEEN 0 AND 100)
);
CREATE INDEX IF NOT EXISTS medical_records_target_idx ON medical_records(target_character_id,created_at DESC);
