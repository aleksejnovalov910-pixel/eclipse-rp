CREATE TABLE IF NOT EXISTS organization_vehicles (
  id BIGSERIAL PRIMARY KEY,
  organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  model VARCHAR(64) NOT NULL,
  name VARCHAR(96) NOT NULL,
  plate VARCHAR(8) NOT NULL UNIQUE,
  min_rank SMALLINT NOT NULL DEFAULT 0 CHECK (min_rank >= 0),
  position_x NUMERIC(12,4) NOT NULL,
  position_y NUMERIC(12,4) NOT NULL,
  position_z NUMERIC(12,4) NOT NULL,
  heading NUMERIC(8,3) NOT NULL DEFAULT 0,
  spawned BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS organization_vehicles_org_idx ON organization_vehicles(organization_id,min_rank);

CREATE TABLE IF NOT EXISTS organization_uniforms (
  id BIGSERIAL PRIMARY KEY,
  organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  key VARCHAR(64) NOT NULL,
  name VARCHAR(96) NOT NULL,
  gender VARCHAR(12) NOT NULL CHECK (gender IN ('male','female','unisex')),
  min_rank SMALLINT NOT NULL DEFAULT 0 CHECK (min_rank >= 0),
  components JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id,key,gender)
);

INSERT INTO inventories(owner_type,owner_id,capacity_weight,slots)
SELECT 'organization',o.id,500.000,80 FROM organizations o
ON CONFLICT (owner_type,owner_id) DO NOTHING;

INSERT INTO organization_vehicles(organization_id,model,name,plate,min_rank,position_x,position_y,position_z,heading)
SELECT o.id,v.model,v.name,v.plate,v.min_rank,v.x,v.y,v.z,v.h
FROM organizations o JOIN (VALUES
 ('lspd','police3','Police Interceptor','LSPD01',0,-445.2,6007.4,31.7,45.0),
 ('lspd','police4','Police Cruiser','LSPD02',1,-449.0,6011.0,31.7,45.0),
 ('ems','ambulance','Ambulance','EMS01',0,294.5,-610.8,43.4,70.0),
 ('ems','granger','EMS Supervisor','EMS02',2,290.5,-607.0,43.4,70.0),
 ('gov','schafter2','Government Sedan','GOV01',0,-543.0,-204.0,38.2,210.0)
) AS v(org_key,model,name,plate,min_rank,x,y,z,h) ON v.org_key=o.key
ON CONFLICT (plate) DO NOTHING;

INSERT INTO organization_uniforms(organization_id,key,name,gender,min_rank,components)
SELECT o.id,u.key,u.name,u.gender,u.min_rank,u.components
FROM organizations o JOIN (VALUES
 ('lspd','patrol','Patrol uniform','male',0,'{"3":{"drawable":0,"texture":0},"4":{"drawable":35,"texture":0},"6":{"drawable":25,"texture":0},"8":{"drawable":58,"texture":0},"11":{"drawable":55,"texture":0}}'::jsonb),
 ('lspd','patrol','Patrol uniform','female',0,'{"3":{"drawable":14,"texture":0},"4":{"drawable":34,"texture":0},"6":{"drawable":25,"texture":0},"8":{"drawable":35,"texture":0},"11":{"drawable":48,"texture":0}}'::jsonb),
 ('ems','paramedic','Paramedic uniform','male',0,'{"4":{"drawable":20,"texture":0},"6":{"drawable":25,"texture":0},"8":{"drawable":15,"texture":0},"11":{"drawable":250,"texture":0}}'::jsonb),
 ('ems','paramedic','Paramedic uniform','female',0,'{"4":{"drawable":23,"texture":0},"6":{"drawable":25,"texture":0},"8":{"drawable":14,"texture":0},"11":{"drawable":258,"texture":0}}'::jsonb),
 ('gov','office','Government suit','unisex',0,'{}'::jsonb)
) AS u(org_key,key,name,gender,min_rank,components) ON u.org_key=o.key
ON CONFLICT (organization_id,key,gender) DO NOTHING;
