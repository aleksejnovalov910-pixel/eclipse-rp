CREATE TABLE IF NOT EXISTS marketplace_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  object_type VARCHAR(24) NOT NULL CHECK (object_type IN ('vehicle','property','business')),
  object_id UUID NOT NULL,
  title VARCHAR(120) NOT NULL,
  price NUMERIC(14,2) NOT NULL CHECK (price > 0),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','sold','cancelled')),
  buyer_character_id INTEGER REFERENCES characters(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW()+INTERVAL '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sold_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS marketplace_active_object_uq ON marketplace_listings(object_type,object_id) WHERE status='active';
CREATE INDEX IF NOT EXISTS marketplace_active_idx ON marketplace_listings(status,created_at DESC);
