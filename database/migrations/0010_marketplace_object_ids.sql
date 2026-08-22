DROP INDEX IF EXISTS marketplace_active_object_uq;
ALTER TABLE marketplace_listings
  ALTER COLUMN object_id TYPE VARCHAR(64) USING object_id::text;
CREATE UNIQUE INDEX IF NOT EXISTS marketplace_active_object_uq
  ON marketplace_listings(object_type,object_id) WHERE status='active';
