ALTER TABLE marketplace_listings DROP CONSTRAINT IF EXISTS marketplace_listings_object_type_check;
ALTER TABLE marketplace_listings ADD CONSTRAINT marketplace_listings_object_type_check CHECK (object_type IN ('vehicle','property','business','item'));
ALTER TABLE marketplace_listings ADD COLUMN IF NOT EXISTS listing_type VARCHAR(16) NOT NULL DEFAULT 'fixed' CHECK (listing_type IN ('fixed','auction'));
ALTER TABLE marketplace_listings ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0);
ALTER TABLE marketplace_listings ADD COLUMN IF NOT EXISTS current_bid NUMERIC(14,2) NULL CHECK (current_bid IS NULL OR current_bid > 0);
ALTER TABLE marketplace_listings ADD COLUMN IF NOT EXISTS highest_bidder_character_id INTEGER NULL REFERENCES characters(id) ON DELETE SET NULL;
ALTER TABLE marketplace_listings ADD COLUMN IF NOT EXISTS auction_ends_at TIMESTAMPTZ NULL;

CREATE TABLE IF NOT EXISTS marketplace_item_escrow (
  listing_id UUID PRIMARY KEY REFERENCES marketplace_listings(id) ON DELETE CASCADE,
  item_key VARCHAR(64) NOT NULL REFERENCES item_definitions(key) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS marketplace_bids (
  id BIGSERIAL PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
  bidder_character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS marketplace_bids_listing_idx ON marketplace_bids(listing_id,amount DESC,created_at DESC);
CREATE INDEX IF NOT EXISTS marketplace_bids_bidder_idx ON marketplace_bids(bidder_character_id,created_at DESC);

CREATE INDEX IF NOT EXISTS marketplace_search_idx ON marketplace_listings(object_type,listing_type,status,created_at DESC);
CREATE INDEX IF NOT EXISTS marketplace_title_search_idx ON marketplace_listings USING gin (to_tsvector('simple',title));
