CREATE TABLE IF NOT EXISTS organizations (
  id BIGSERIAL PRIMARY KEY,
  key VARCHAR(48) NOT NULL UNIQUE,
  name VARCHAR(96) NOT NULL,
  kind VARCHAR(32) NOT NULL,
  color INTEGER NOT NULL DEFAULT 0,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS organization_ranks (
  id BIGSERIAL PRIMARY KEY,
  organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  rank_index SMALLINT NOT NULL,
  name VARCHAR(48) NOT NULL,
  salary NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (salary >= 0),
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(organization_id, rank_index)
);

CREATE TABLE IF NOT EXISTS organization_members (
  organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  rank_id BIGINT NOT NULL REFERENCES organization_ranks(id) ON DELETE RESTRICT,
  on_duty BOOLEAN NOT NULL DEFAULT FALSE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(organization_id, character_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS organization_members_one_org_per_character ON organization_members(character_id);

CREATE TABLE IF NOT EXISTS organization_calls (
  id BIGSERIAL PRIMARY KEY,
  organization_kind VARCHAR(32) NOT NULL,
  caller_character_id INTEGER REFERENCES characters(id) ON DELETE SET NULL,
  assigned_character_id INTEGER REFERENCES characters(id) ON DELETE SET NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'open',
  message VARCHAR(220) NOT NULL,
  position_x NUMERIC(12,4) NOT NULL,
  position_y NUMERIC(12,4) NOT NULL,
  position_z NUMERIC(12,4) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS organization_calls_kind_status_idx ON organization_calls(organization_kind,status,created_at DESC);

CREATE TABLE IF NOT EXISTS organization_audit_log (
  id BIGSERIAL PRIMARY KEY,
  organization_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
  actor_character_id INTEGER REFERENCES characters(id) ON DELETE SET NULL,
  target_character_id INTEGER REFERENCES characters(id) ON DELETE SET NULL,
  action VARCHAR(64) NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO organizations(key,name,kind,color)
SELECT * FROM (VALUES
 ('lspd','Los Santos Police Department','police',38),
 ('ems','Emergency Medical Services','ems',1),
 ('gov','Government of San Andreas','government',5)
) AS seed(key,name,kind,color)
WHERE NOT EXISTS (SELECT 1 FROM organizations);

INSERT INTO organization_ranks(organization_id,rank_index,name,salary,permissions)
SELECT o.id,r.rank_index,r.name,r.salary,r.permissions
FROM organizations o
JOIN (VALUES
 ('lspd',0,'Cadet',450::numeric,'{"duty":true,"calls":true}'::jsonb),
 ('lspd',1,'Officer',650::numeric,'{"duty":true,"calls":true,"mdt":true}'::jsonb),
 ('lspd',2,'Sergeant',900::numeric,'{"duty":true,"calls":true,"mdt":true,"manage_members":true}'::jsonb),
 ('lspd',3,'Chief',1400::numeric,'{"all":true}'::jsonb),
 ('ems',0,'Intern',450::numeric,'{"duty":true,"calls":true}'::jsonb),
 ('ems',1,'Paramedic',650::numeric,'{"duty":true,"calls":true,"medical":true}'::jsonb),
 ('ems',2,'Doctor',900::numeric,'{"duty":true,"calls":true,"medical":true,"manage_members":true}'::jsonb),
 ('ems',3,'Chief Physician',1400::numeric,'{"all":true}'::jsonb),
 ('gov',0,'Clerk',500::numeric,'{"duty":true}'::jsonb),
 ('gov',1,'Secretary',750::numeric,'{"duty":true,"licenses":true}'::jsonb),
 ('gov',2,'Minister',1100::numeric,'{"duty":true,"licenses":true,"manage_members":true}'::jsonb),
 ('gov',3,'Governor',1600::numeric,'{"all":true}'::jsonb)
) AS r(org_key,rank_index,name,salary,permissions) ON r.org_key=o.key
ON CONFLICT (organization_id,rank_index) DO NOTHING;
