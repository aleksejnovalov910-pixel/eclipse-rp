CREATE TABLE IF NOT EXISTS dealerships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(96) NOT NULL,
  position_x NUMERIC(12,4) NOT NULL,
  position_y NUMERIC(12,4) NOT NULL,
  position_z NUMERIC(12,4) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS dealership_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id UUID NOT NULL REFERENCES dealerships(id) ON DELETE CASCADE,
  model VARCHAR(64) NOT NULL,
  display_name VARCHAR(96) NOT NULL,
  price NUMERIC(14,2) NOT NULL CHECK(price>0),
  stock INTEGER NOT NULL DEFAULT 10 CHECK(stock>=0),
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS dealership_offers_dealer_idx ON dealership_offers(dealership_id,enabled);

WITH d AS (
 INSERT INTO dealerships(name,position_x,position_y,position_z)
 SELECT 'Premium Deluxe Motorsport',-33.74,-1102.01,26.42
 WHERE NOT EXISTS(SELECT 1 FROM dealerships)
 RETURNING id
), dealer AS (SELECT id FROM d UNION ALL SELECT id FROM dealerships ORDER BY id LIMIT 1)
INSERT INTO dealership_offers(dealership_id,model,display_name,price,stock)
SELECT dealer.id,v.model,v.display_name,v.price,v.stock FROM dealer CROSS JOIN (VALUES
 ('sultan','Karin Sultan',95000::numeric,15),
 ('tailgater','Obey Tailgater',145000::numeric,12),
 ('schafter2','Benefactor Schafter',220000::numeric,10),
 ('baller','Gallivanter Baller',310000::numeric,8)
) AS v(model,display_name,price,stock)
WHERE NOT EXISTS(SELECT 1 FROM dealership_offers);
