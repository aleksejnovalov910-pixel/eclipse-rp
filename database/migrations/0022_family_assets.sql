INSERT INTO inventories(owner_type,owner_id,capacity_weight,slots)
SELECT 'family',f.id,300.000,60 FROM families f
ON CONFLICT (owner_type,owner_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS family_upgrades (
  family_id BIGINT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  upgrade_key VARCHAR(48) NOT NULL,
  level SMALLINT NOT NULL DEFAULT 0 CHECK (level >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(family_id,upgrade_key)
);

CREATE TABLE IF NOT EXISTS family_upgrade_definitions (
  upgrade_key VARCHAR(48) PRIMARY KEY,
  name VARCHAR(96) NOT NULL,
  max_level SMALLINT NOT NULL CHECK(max_level > 0),
  base_price NUMERIC(14,2) NOT NULL CHECK(base_price > 0),
  description VARCHAR(220) NOT NULL
);

INSERT INTO family_upgrade_definitions(upgrade_key,name,max_level,base_price,description) VALUES
 ('storage','Расширение склада',5,50000,'+40 слотов и +150 кг вместимости за уровень'),
 ('fleet','Расширение автопарка',5,75000,'Повышает лимит семейного транспорта'),
 ('contracts','Контрактный отдел',3,100000,'Открывает более выгодные семейные контракты')
ON CONFLICT(upgrade_key) DO NOTHING;

CREATE INDEX IF NOT EXISTS vehicles_owner_family_active_idx ON vehicles(owner_family_id,id) WHERE owner_family_id IS NOT NULL;
