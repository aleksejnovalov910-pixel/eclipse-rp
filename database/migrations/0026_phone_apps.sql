CREATE TABLE IF NOT EXISTS phone_calls (
  id BIGSERIAL PRIMARY KEY,
  caller_character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  callee_character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  status VARCHAR(16) NOT NULL CHECK (status IN ('missed','declined','completed','cancelled')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  answered_at TIMESTAMPTZ NULL,
  ended_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS phone_calls_caller_idx ON phone_calls(caller_character_id,started_at DESC);
CREATE INDEX IF NOT EXISTS phone_calls_callee_idx ON phone_calls(callee_character_id,started_at DESC);

CREATE TABLE IF NOT EXISTS phone_classifieds (
  id BIGSERIAL PRIMARY KEY,
  author_character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  category VARCHAR(24) NOT NULL CHECK (category IN ('general','vehicle','property','service','job')),
  title VARCHAR(80) NOT NULL,
  body VARCHAR(300) NOT NULL,
  phone_number VARCHAR(10) NOT NULL,
  price NUMERIC(14,2) NULL CHECK (price IS NULL OR price >= 0),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW()+INTERVAL '24 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS phone_classifieds_active_idx ON phone_classifieds(expires_at DESC,created_at DESC);
