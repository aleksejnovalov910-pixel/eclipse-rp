CREATE TABLE IF NOT EXISTS character_documents (
  character_id INTEGER PRIMARY KEY REFERENCES characters(id) ON DELETE CASCADE,
  passport_number VARCHAR(24) NOT NULL UNIQUE,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  licenses JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS criminal_factions (
  id BIGSERIAL PRIMARY KEY,
  key VARCHAR(48) NOT NULL UNIQUE,
  name VARCHAR(96) NOT NULL,
  color INTEGER NOT NULL DEFAULT 0,
  balance NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  reputation INTEGER NOT NULL DEFAULT 0 CHECK (reputation >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS criminal_faction_ranks (
  id BIGSERIAL PRIMARY KEY,
  faction_id BIGINT NOT NULL REFERENCES criminal_factions(id) ON DELETE CASCADE,
  rank_index SMALLINT NOT NULL,
  name VARCHAR(48) NOT NULL,
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(faction_id, rank_index)
);

CREATE TABLE IF NOT EXISTS criminal_faction_members (
  faction_id BIGINT NOT NULL REFERENCES criminal_factions(id) ON DELETE CASCADE,
  character_id INTEGER NOT NULL UNIQUE REFERENCES characters(id) ON DELETE CASCADE,
  rank_id BIGINT NOT NULL REFERENCES criminal_faction_ranks(id) ON DELETE RESTRICT,
  contribution INTEGER NOT NULL DEFAULT 0,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(faction_id, character_id)
);

CREATE TABLE IF NOT EXISTS criminal_territories (
  id BIGSERIAL PRIMARY KEY,
  key VARCHAR(48) NOT NULL UNIQUE,
  name VARCHAR(96) NOT NULL,
  owner_faction_id BIGINT REFERENCES criminal_factions(id) ON DELETE SET NULL,
  center_x NUMERIC(12,4) NOT NULL,
  center_y NUMERIC(12,4) NOT NULL,
  radius NUMERIC(8,2) NOT NULL DEFAULT 120 CHECK (radius > 0),
  income NUMERIC(14,2) NOT NULL DEFAULT 5000 CHECK (income >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS criminal_contracts (
  id BIGSERIAL PRIMARY KEY,
  faction_id BIGINT NOT NULL REFERENCES criminal_factions(id) ON DELETE CASCADE,
  contract_key VARCHAR(48) NOT NULL,
  title VARCHAR(96) NOT NULL,
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0),
  target INTEGER NOT NULL CHECK (target > 0),
  reward_money NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (reward_money >= 0),
  reward_reputation INTEGER NOT NULL DEFAULT 0 CHECK (reward_reputation >= 0),
  expires_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS criminal_contracts_faction_active_idx ON criminal_contracts(faction_id,completed_at,expires_at);

INSERT INTO criminal_factions(key,name,color)
VALUES ('ballas','Ballas',27),('vagos','Los Santos Vagos',46),('families','The Families',25),('marabunta','Marabunta Grande',38)
ON CONFLICT (key) DO NOTHING;

INSERT INTO criminal_faction_ranks(faction_id,rank_index,name,permissions)
SELECT f.id,r.rank_index,r.name,r.permissions FROM criminal_factions f
JOIN (VALUES
 ('ballas',0,'Youngster','{}'::jsonb),('ballas',1,'Gangster','{"stash":true}'::jsonb),('ballas',2,'OG','{"stash":true,"invite":true,"contracts":true}'::jsonb),('ballas',3,'Boss','{"all":true}'::jsonb),
 ('vagos',0,'Novato','{}'::jsonb),('vagos',1,'Soldado','{"stash":true}'::jsonb),('vagos',2,'Veterano','{"stash":true,"invite":true,"contracts":true}'::jsonb),('vagos',3,'Jefe','{"all":true}'::jsonb),
 ('families',0,'Young G','{}'::jsonb),('families',1,'Hustler','{"stash":true}'::jsonb),('families',2,'OG','{"stash":true,"invite":true,"contracts":true}'::jsonb),('families',3,'Shot Caller','{"all":true}'::jsonb),
 ('marabunta',0,'Novato','{}'::jsonb),('marabunta',1,'Soldado','{"stash":true}'::jsonb),('marabunta',2,'Veterano','{"stash":true,"invite":true,"contracts":true}'::jsonb),('marabunta',3,'Jefe','{"all":true}'::jsonb)
) AS r(faction_key,rank_index,name,permissions) ON r.faction_key=f.key
ON CONFLICT (faction_id,rank_index) DO NOTHING;

INSERT INTO criminal_territories(key,name,center_x,center_y,radius,income)
VALUES
 ('grove_davis','Davis / Grove Street',105.0,-1940.0,180,6000),
 ('rancho','Rancho',450.0,-1850.0,180,6000),
 ('strawberry','Strawberry',280.0,-1450.0,180,5500),
 ('la_mesa','La Mesa',900.0,-1250.0,200,7000),
 ('chamberlain','Chamberlain Hills',-150.0,-1550.0,170,5500)
ON CONFLICT (key) DO NOTHING;