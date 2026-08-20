-- ECLIPSE RP — начальная схема.
--
-- Соглашения:
--   * деньги хранятся в NUMERIC(14,2) — никаких float в финансах;
--   * все уникальные ограничения по логину/имени работают по нормализованной
--     колонке в нижнем регистре, иначе "Alex" и "alex" станут двумя аккаунтами;
--   * удаление персонажа — мягкое (deleted_at), чтобы не терять историю
--     транзакций и не ломать внешние ключи из будущих таблиц.

CREATE TABLE IF NOT EXISTS _migrations (
    name       TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS accounts (
    id            SERIAL PRIMARY KEY,
    login         VARCHAR(20)  NOT NULL,
    login_lower   VARCHAR(20)  NOT NULL,
    email         VARCHAR(254) NOT NULL,
    password_hash TEXT         NOT NULL,
    admin_level   SMALLINT     NOT NULL DEFAULT 0,
    social_club   VARCHAR(64),
    last_ip       VARCHAR(45),
    last_login_at TIMESTAMPTZ,
    banned_until  TIMESTAMPTZ,
    ban_reason    TEXT,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT accounts_admin_level_range CHECK (admin_level BETWEEN 0 AND 5)
);

CREATE UNIQUE INDEX IF NOT EXISTS accounts_login_lower_key ON accounts (login_lower);
CREATE UNIQUE INDEX IF NOT EXISTS accounts_email_key       ON accounts (email);

CREATE TABLE IF NOT EXISTS characters (
    id             SERIAL PRIMARY KEY,
    account_id     INTEGER      NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
    slot           SMALLINT     NOT NULL,
    first_name     VARCHAR(16)  NOT NULL,
    last_name      VARCHAR(16)  NOT NULL,
    name_lower     VARCHAR(33)  NOT NULL,
    gender         VARCHAR(6)   NOT NULL,
    level          SMALLINT     NOT NULL DEFAULT 1,
    experience     INTEGER      NOT NULL DEFAULT 0,
    played_minutes INTEGER      NOT NULL DEFAULT 0,
    cash           NUMERIC(14,2) NOT NULL DEFAULT 0,
    bank           NUMERIC(14,2) NOT NULL DEFAULT 0,
    health         SMALLINT     NOT NULL DEFAULT 100,
    armour         SMALLINT     NOT NULL DEFAULT 0,
    position_x     NUMERIC(10,3) NOT NULL DEFAULT 0,
    position_y     NUMERIC(10,3) NOT NULL DEFAULT 0,
    position_z     NUMERIC(10,3) NOT NULL DEFAULT 0,
    heading        NUMERIC(6,2)  NOT NULL DEFAULT 0,
    dimension      INTEGER      NOT NULL DEFAULT 0,
    appearance     JSONB        NOT NULL DEFAULT '{}'::jsonb,
    deleted_at     TIMESTAMPTZ,
    last_played_at TIMESTAMPTZ,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT characters_gender_valid CHECK (gender IN ('male', 'female')),
    CONSTRAINT characters_slot_range   CHECK (slot BETWEEN 0 AND 2),
    CONSTRAINT characters_money_non_negative CHECK (cash >= 0 AND bank >= 0)
);

-- Слот занят только живым персонажем: после мягкого удаления его можно занять снова.
CREATE UNIQUE INDEX IF NOT EXISTS characters_account_slot_key
    ON characters (account_id, slot) WHERE deleted_at IS NULL;

-- Имя уникально среди живых персонажей.
CREATE UNIQUE INDEX IF NOT EXISTS characters_name_key
    ON characters (name_lower) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS characters_account_id_idx ON characters (account_id);

CREATE TABLE IF NOT EXISTS auth_log (
    id              BIGSERIAL PRIMARY KEY,
    account_id      INTEGER REFERENCES accounts (id) ON DELETE SET NULL,
    login_attempted VARCHAR(64) NOT NULL,
    ip              VARCHAR(45),
    social_club     VARCHAR(64),
    success         BOOLEAN     NOT NULL,
    failure_reason  VARCHAR(32),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Индекс под типовой запрос расследования: "последние попытки по аккаунту".
CREATE INDEX IF NOT EXISTS auth_log_account_created_idx ON auth_log (account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS auth_log_ip_created_idx      ON auth_log (ip, created_at DESC);
