CREATE TABLE IF NOT EXISTS casino_wallets(
  character_id BIGINT PRIMARY KEY REFERENCES characters(id) ON DELETE CASCADE,
  chips BIGINT NOT NULL DEFAULT 0 CHECK(chips>=0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS casino_game_history(
  id BIGSERIAL PRIMARY KEY,
  character_id BIGINT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  game VARCHAR(24) NOT NULL CHECK(game IN ('slots','roulette','dice')),
  bet BIGINT NOT NULL CHECK(bet>0),
  payout BIGINT NOT NULL CHECK(payout>=0),
  result JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS casino_game_history_character_idx ON casino_game_history(character_id,created_at DESC);

CREATE TABLE IF NOT EXISTS activity_definitions(
  key VARCHAR(48) PRIMARY KEY,
  name VARCHAR(96) NOT NULL,
  description VARCHAR(220) NOT NULL,
  kind VARCHAR(24) NOT NULL CHECK(kind IN ('reaction','checkpoint','delivery')),
  reward_cash NUMERIC(14,2) NOT NULL CHECK(reward_cash>=0),
  cooldown_hours INTEGER NOT NULL DEFAULT 24 CHECK(cooldown_hours BETWEEN 1 AND 168),
  position_x NUMERIC(12,3) NOT NULL,
  position_y NUMERIC(12,3) NOT NULL,
  position_z NUMERIC(12,3) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS character_activity_progress(
  character_id BIGINT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  activity_key VARCHAR(48) NOT NULL REFERENCES activity_definitions(key) ON DELETE CASCADE,
  completions INTEGER NOT NULL DEFAULT 0 CHECK(completions>=0),
  last_completed_at TIMESTAMPTZ NULL,
  best_score INTEGER NULL,
  PRIMARY KEY(character_id,activity_key)
);

INSERT INTO activity_definitions(key,name,description,kind,reward_cash,cooldown_hours,position_x,position_y,position_z) VALUES
('pier_reaction','Реакция на пирсе','Мини-игра на скорость реакции: сервер задаёт момент, игрок подтверждает сигнал.','reaction',450,12,-1604.3,-1072.1,13.0),
('vinewood_checkpoint','Vinewood Challenge','Последовательно посетите контрольные точки по холмам Vinewood.','checkpoint',900,24,646.8,267.1,103.3),
('city_delivery_event','Городская доставка','Короткое ежедневное событие доставки между районами города.','delivery',750,12,-424.2,-2789.5,6.0)
ON CONFLICT(key) DO UPDATE SET name=EXCLUDED.name,description=EXCLUDED.description,kind=EXCLUDED.kind,reward_cash=EXCLUDED.reward_cash,cooldown_hours=EXCLUDED.cooldown_hours,position_x=EXCLUDED.position_x,position_y=EXCLUDED.position_y,position_z=EXCLUDED.position_z,enabled=TRUE;
