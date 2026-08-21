CREATE TABLE IF NOT EXISTS business_products (
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  item_key VARCHAR(64) NOT NULL REFERENCES item_definitions(key) ON DELETE RESTRICT,
  base_price NUMERIC(14,2) NOT NULL CHECK(base_price>0),
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY(business_id,item_key)
);

INSERT INTO business_products(business_id,item_key,base_price)
SELECT b.id,p.item_key,p.base_price
FROM businesses b
CROSS JOIN (VALUES
 ('water_bottle',18::numeric),
 ('sandwich',32::numeric),
 ('first_aid_small',145::numeric),
 ('repair_kit',650::numeric),
 ('fuel_can',420::numeric)
) AS p(item_key,base_price)
WHERE b.kind='store'
ON CONFLICT(business_id,item_key) DO UPDATE SET base_price=EXCLUDED.base_price,enabled=TRUE;
