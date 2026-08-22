CREATE TABLE IF NOT EXISTS vehicle_access (
  vehicle_id BIGINT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  granted_by_character_id INTEGER REFERENCES characters(id) ON DELETE SET NULL,
  access_level VARCHAR(16) NOT NULL DEFAULT 'driver' CHECK (access_level IN ('driver','manager')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (vehicle_id, character_id)
);
CREATE INDEX IF NOT EXISTS vehicle_access_character_idx ON vehicle_access(character_id);

INSERT INTO businesses(kind,name,price,stock,stock_capacity,wholesale_unit_cost,markup_percent,position_x,position_y,position_z)
SELECT 'service','Los Santos Customs Burton',1450000::numeric,250,600,95::numeric,35,-337.41,-136.88,39.01
WHERE NOT EXISTS (SELECT 1 FROM businesses WHERE kind='service');
