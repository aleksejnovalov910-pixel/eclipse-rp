CREATE TABLE IF NOT EXISTS progression_claims(
 character_id BIGINT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
 claim_key VARCHAR(96) NOT NULL,
 claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 PRIMARY KEY(character_id,claim_key)
);
CREATE TABLE IF NOT EXISTS progression_points(
 character_id BIGINT PRIMARY KEY REFERENCES characters(id) ON DELETE CASCADE,
 points INTEGER NOT NULL DEFAULT 0 CHECK(points>=0),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS battle_pass_claims(
 character_id BIGINT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
 season_key VARCHAR(48) NOT NULL,
 tier INTEGER NOT NULL CHECK(tier BETWEEN 1 AND 100),
 claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 PRIMARY KEY(character_id,season_key,tier)
);
