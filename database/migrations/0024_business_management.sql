CREATE TABLE IF NOT EXISTS business_employees (
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  character_id BIGINT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  role VARCHAR(16) NOT NULL DEFAULT 'employee' CHECK (role IN ('employee','manager')),
  salary NUMERIC(14,2) NOT NULL DEFAULT 500 CHECK (salary >= 0),
  hired_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(business_id,character_id)
);
CREATE INDEX IF NOT EXISTS business_employees_character_idx ON business_employees(character_id);

CREATE TABLE IF NOT EXISTS business_upgrades (
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  upgrade_key VARCHAR(32) NOT NULL CHECK (upgrade_key IN ('storage','efficiency','security')),
  level SMALLINT NOT NULL DEFAULT 0 CHECK (level BETWEEN 0 AND 5),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(business_id,upgrade_key)
);
INSERT INTO business_upgrades(business_id,upgrade_key)
SELECT b.id,u.key FROM businesses b CROSS JOIN (VALUES('storage'),('efficiency'),('security')) u(key)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS business_audit_log (
  id BIGSERIAL PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  actor_character_id BIGINT REFERENCES characters(id) ON DELETE SET NULL,
  target_character_id BIGINT REFERENCES characters(id) ON DELETE SET NULL,
  action VARCHAR(48) NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS business_audit_business_idx ON business_audit_log(business_id,created_at DESC);
