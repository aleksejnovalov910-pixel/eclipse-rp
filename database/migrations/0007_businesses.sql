CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind VARCHAR(32) NOT NULL,
  name VARCHAR(96) NOT NULL,
  owner_character_id INTEGER REFERENCES characters(id) ON DELETE SET NULL,
  price NUMERIC(14,2) NOT NULL CHECK (price > 0),
  cash_balance NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (cash_balance >= 0),
  bank_balance NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (bank_balance >= 0),
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  stock_capacity INTEGER NOT NULL DEFAULT 500 CHECK (stock_capacity > 0),
  wholesale_unit_cost NUMERIC(14,2) NOT NULL DEFAULT 100 CHECK (wholesale_unit_cost > 0),
  markup_percent INTEGER NOT NULL DEFAULT 25 CHECK (markup_percent BETWEEN 0 AND 300),
  position_x NUMERIC(12,4) NOT NULL,
  position_y NUMERIC(12,4) NOT NULL,
  position_z NUMERIC(12,4) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS businesses_owner_idx ON businesses(owner_character_id);

CREATE TABLE IF NOT EXISTS business_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  character_id INTEGER REFERENCES characters(id) ON DELETE SET NULL,
  kind VARCHAR(48) NOT NULL,
  amount NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS business_transactions_business_idx ON business_transactions(business_id, created_at DESC);

INSERT INTO businesses(kind,name,price,stock,stock_capacity,wholesale_unit_cost,markup_percent,position_x,position_y,position_z)
SELECT * FROM (VALUES
 ('store','24/7 Strawberry',850000::numeric,180,500,55::numeric,30,-47.15,-1758.66,29.42),
 ('fuel','АЗС Route 68',1250000::numeric,300,800,42::numeric,24,1208.47,2660.15,37.90),
 ('clothing','Binco Textile City',1100000::numeric,140,400,125::numeric,40,425.24,-806.09,29.49),
 ('barber','Barbershop Vespucci',720000::numeric,90,250,80::numeric,35,-814.31,-183.82,37.57)
) AS seed(kind,name,price,stock,stock_capacity,wholesale_unit_cost,markup_percent,position_x,position_y,position_z)
WHERE NOT EXISTS (SELECT 1 FROM businesses);
