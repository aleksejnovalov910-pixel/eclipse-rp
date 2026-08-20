CREATE TABLE IF NOT EXISTS properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind VARCHAR(24) NOT NULL CHECK (kind IN ('house', 'apartment')),
  name VARCHAR(80) NOT NULL,
  price NUMERIC(14,2) NOT NULL CHECK (price > 0),
  owner_character_id BIGINT NULL REFERENCES characters(id) ON DELETE SET NULL,
  exterior_x NUMERIC(12,3) NOT NULL,
  exterior_y NUMERIC(12,3) NOT NULL,
  exterior_z NUMERIC(12,3) NOT NULL,
  exterior_heading NUMERIC(7,2) NOT NULL DEFAULT 0,
  exterior_dimension INTEGER NOT NULL DEFAULT 0,
  interior_x NUMERIC(12,3) NOT NULL,
  interior_y NUMERIC(12,3) NOT NULL,
  interior_z NUMERIC(12,3) NOT NULL,
  interior_heading NUMERIC(7,2) NOT NULL DEFAULT 0,
  instance_dimension INTEGER NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS properties_owner_idx ON properties(owner_character_id);
CREATE INDEX IF NOT EXISTS properties_kind_idx ON properties(kind);

INSERT INTO properties (
  id, kind, name, price,
  exterior_x, exterior_y, exterior_z, exterior_heading,
  interior_x, interior_y, interior_z, interior_heading, instance_dimension
) VALUES
('10000000-0000-4000-8000-000000000001','apartment','Alta Street Apartment 1','185000.00',-270.6,-957.3,31.2,205,-786.9,315.7,217.6,270,11001),
('10000000-0000-4000-8000-000000000002','apartment','Integrity Way Apartment 1','240000.00',-47.5,-585.8,37.9,70,-786.9,315.7,217.6,270,11002),
('10000000-0000-4000-8000-000000000003','house','Mirror Park House 1','325000.00',1260.2,-582.4,68.9,292,266.0,-1007.4,-101.0,0,11003),
('10000000-0000-4000-8000-000000000004','house','Vinewood House 1','680000.00',-686.2,596.0,143.6,40,346.5,-1012.4,-99.2,0,11004),
('10000000-0000-4000-8000-000000000005','house','Richman House 1','920000.00',-1467.5,34.5,54.5,130,-174.0,497.6,137.7,190,11005)
ON CONFLICT (id) DO NOTHING;
