ALTER TABLE properties ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(8,2) NOT NULL DEFAULT 250.00 CHECK (tax_rate >= 0);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS tax_paid_until TIMESTAMPTZ NULL;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS rent_price NUMERIC(14,2) NULL CHECK (rent_price IS NULL OR rent_price > 0);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS rent_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS garage_slots INTEGER NOT NULL DEFAULT 1 CHECK (garage_slots BETWEEN 0 AND 20);

CREATE TABLE IF NOT EXISTS property_tenants (
  property_id UUID PRIMARY KEY REFERENCES properties(id) ON DELETE CASCADE,
  tenant_character_id BIGINT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  rent_paid_until TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS property_tenants_character_idx ON property_tenants(tenant_character_id);

-- properties use UUID ids while the shared inventory owner_id is BIGINT.
-- Keep a permanent surrogate owner id instead of unsafe UUID casts/hashes.
CREATE TABLE IF NOT EXISTS property_storage_owners (
  storage_owner_id BIGSERIAL PRIMARY KEY,
  property_id UUID NOT NULL UNIQUE REFERENCES properties(id) ON DELETE CASCADE
);
INSERT INTO property_storage_owners(property_id)
SELECT id FROM properties ON CONFLICT(property_id) DO NOTHING;
INSERT INTO inventories(owner_type,owner_id,capacity_weight,slots)
SELECT 'property',storage_owner_id,250.000,60 FROM property_storage_owners
ON CONFLICT(owner_type,owner_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS property_furniture (
  id BIGSERIAL PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  model VARCHAR(96) NOT NULL,
  position_x NUMERIC(12,3) NOT NULL,
  position_y NUMERIC(12,3) NOT NULL,
  position_z NUMERIC(12,3) NOT NULL,
  rotation_x NUMERIC(8,3) NOT NULL DEFAULT 0,
  rotation_y NUMERIC(8,3) NOT NULL DEFAULT 0,
  rotation_z NUMERIC(8,3) NOT NULL DEFAULT 0,
  placed_by BIGINT NULL REFERENCES characters(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS property_furniture_property_idx ON property_furniture(property_id);

CREATE TABLE IF NOT EXISTS property_garage_vehicles (
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  vehicle_id BIGINT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  stored_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(property_id,vehicle_id),
  UNIQUE(vehicle_id)
);
