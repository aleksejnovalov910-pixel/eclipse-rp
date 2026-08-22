-- Generic quest/progression platform. Definitions are data; progress is per character.

CREATE TABLE IF NOT EXISTS quest_definitions (
    key          VARCHAR(48) PRIMARY KEY,
    title        VARCHAR(80) NOT NULL,
    description  VARCHAR(240) NOT NULL,
    target       INTEGER NOT NULL CHECK (target > 0),
    reward_cash  NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (reward_cash >= 0),
    reward_bank  NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (reward_bank >= 0),
    sort_order   INTEGER NOT NULL DEFAULT 0,
    enabled      BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS quest_progress (
    character_id INTEGER NOT NULL REFERENCES characters (id) ON DELETE CASCADE,
    quest_key    VARCHAR(48) NOT NULL REFERENCES quest_definitions (key) ON DELETE CASCADE,
    progress     INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0),
    completed_at TIMESTAMPTZ,
    claimed_at   TIMESTAMPTZ,
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (character_id, quest_key)
);

INSERT INTO quest_definitions (key, title, description, target, reward_cash, reward_bank, sort_order)
VALUES
  ('welcome', 'Добро пожаловать', 'Войдите в город своим персонажем.', 1, 500, 500, 10),
  ('open_phone', 'На связи', 'Откройте телефон и получите свой номер.', 1, 250, 0, 20),
  ('use_bank', 'Первый визит в банк', 'Внесите или снимите деньги со счёта.', 1, 500, 0, 30),
  ('first_job', 'Рабочий день', 'Завершите первое рабочее задание.', 1, 1000, 500, 40),
  ('join_family', 'Свои люди', 'Создайте или вступите в семью.', 1, 500, 500, 50)
ON CONFLICT (key) DO UPDATE SET
  title=EXCLUDED.title, description=EXCLUDED.description, target=EXCLUDED.target,
  reward_cash=EXCLUDED.reward_cash, reward_bank=EXCLUDED.reward_bank,
  sort_order=EXCLUDED.sort_order, enabled=TRUE;
