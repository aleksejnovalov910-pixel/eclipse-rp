-- ECLIPSE RP — постоянное ядро мира и экономики.
-- Все денежные операции должны фиксироваться транзакционно и оставлять ledger.

CREATE TABLE IF NOT EXISTS bank_transactions (
    id              BIGSERIAL PRIMARY KEY,
    character_id    INTEGER NOT NULL REFERENCES characters(id) ON DELETE RESTRICT,
    counterparty_id INTEGER REFERENCES characters(id) ON DELETE SET NULL,
    kind            VARCHAR(32) NOT NULL,
    amount          NUMERIC(14,2) NOT NULL,
    balance_after   NUMERIC(14,2) NOT NULL,
    description     VARCHAR(160),
    metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT bank_transactions_amount_positive CHECK (amount > 0),
    CONSTRAINT bank_transactions_balance_non_negative CHECK (balance_after >= 0)
);
CREATE INDEX IF NOT EXISTS bank_transactions_character_created_idx
    ON bank_transactions(character_id, created_at DESC);

CREATE TABLE IF NOT EXISTS item_definitions (
    key             VARCHAR(64) PRIMARY KEY,
    name            VARCHAR(96) NOT NULL,
    category        VARCHAR(32) NOT NULL,
    weight          NUMERIC(8,3) NOT NULL DEFAULT 0,
    stack_size      INTEGER NOT NULL DEFAULT 1,
    tradable        BOOLEAN NOT NULL DEFAULT TRUE,
    droppable       BOOLEAN NOT NULL DEFAULT TRUE,
    metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
    CONSTRAINT item_definitions_weight_non_negative CHECK (weight >= 0),
    CONSTRAINT item_definitions_stack_positive CHECK (stack_size > 0)
);

CREATE TABLE IF NOT EXISTS inventories (
    id              BIGSERIAL PRIMARY KEY,
    owner_type      VARCHAR(24) NOT NULL,
    owner_id        BIGINT NOT NULL,
    capacity_weight NUMERIC(10,3) NOT NULL DEFAULT 30,
    slots           SMALLINT NOT NULL DEFAULT 30,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT inventories_owner_type_valid CHECK (owner_type IN ('character','vehicle','family','property','business')),
    CONSTRAINT inventories_capacity_positive CHECK (capacity_weight > 0 AND slots > 0),
    CONSTRAINT inventories_owner_unique UNIQUE(owner_type, owner_id)
);

CREATE TABLE IF NOT EXISTS inventory_items (
    id            BIGSERIAL PRIMARY KEY,
    inventory_id  BIGINT NOT NULL REFERENCES inventories(id) ON DELETE CASCADE,
    item_key      VARCHAR(64) NOT NULL REFERENCES item_definitions(key) ON DELETE RESTRICT,
    slot          SMALLINT NOT NULL,
    quantity      INTEGER NOT NULL DEFAULT 1,
    metadata      JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT inventory_items_quantity_positive CHECK (quantity > 0),
    CONSTRAINT inventory_items_slot_non_negative CHECK (slot >= 0),
    CONSTRAINT inventory_items_slot_unique UNIQUE(inventory_id, slot)
);
CREATE INDEX IF NOT EXISTS inventory_items_inventory_idx ON inventory_items(inventory_id);

CREATE TABLE IF NOT EXISTS vehicles (
    id              BIGSERIAL PRIMARY KEY,
    owner_character_id INTEGER REFERENCES characters(id) ON DELETE SET NULL,
    owner_family_id BIGINT,
    model           VARCHAR(64) NOT NULL,
    vin             VARCHAR(24) NOT NULL UNIQUE,
    plate           VARCHAR(12) UNIQUE,
    primary_color   INTEGER NOT NULL DEFAULT 0,
    secondary_color INTEGER NOT NULL DEFAULT 0,
    fuel            NUMERIC(6,2) NOT NULL DEFAULT 100,
    mileage         NUMERIC(12,2) NOT NULL DEFAULT 0,
    engine_health   NUMERIC(7,2) NOT NULL DEFAULT 1000,
    body_health     NUMERIC(7,2) NOT NULL DEFAULT 1000,
    insurance_until TIMESTAMPTZ,
    locked          BOOLEAN NOT NULL DEFAULT TRUE,
    impounded       BOOLEAN NOT NULL DEFAULT FALSE,
    position_x      NUMERIC(10,3),
    position_y      NUMERIC(10,3),
    position_z      NUMERIC(10,3),
    heading         NUMERIC(6,2),
    dimension       INTEGER NOT NULL DEFAULT 0,
    tuning          JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT vehicles_fuel_range CHECK (fuel BETWEEN 0 AND 100),
    CONSTRAINT vehicles_mileage_non_negative CHECK (mileage >= 0),
    CONSTRAINT vehicles_health_non_negative CHECK (engine_health >= 0 AND body_health >= 0)
);
CREATE INDEX IF NOT EXISTS vehicles_owner_character_idx ON vehicles(owner_character_id);

CREATE TABLE IF NOT EXISTS families (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(40) NOT NULL,
    name_lower      VARCHAR(40) NOT NULL UNIQUE,
    owner_character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE RESTRICT,
    balance         NUMERIC(14,2) NOT NULL DEFAULT 0,
    reputation      INTEGER NOT NULL DEFAULT 0,
    level           SMALLINT NOT NULL DEFAULT 1,
    color           INTEGER NOT NULL DEFAULT 0,
    settings        JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT families_balance_non_negative CHECK (balance >= 0),
    CONSTRAINT families_reputation_non_negative CHECK (reputation >= 0),
    CONSTRAINT families_level_positive CHECK (level > 0)
);

ALTER TABLE vehicles
    ADD CONSTRAINT vehicles_owner_family_fk
    FOREIGN KEY (owner_family_id) REFERENCES families(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS vehicles_owner_family_idx ON vehicles(owner_family_id);

CREATE TABLE IF NOT EXISTS family_ranks (
    id          BIGSERIAL PRIMARY KEY,
    family_id   BIGINT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    rank_index  SMALLINT NOT NULL,
    name        VARCHAR(32) NOT NULL,
    permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
    CONSTRAINT family_ranks_index_unique UNIQUE(family_id, rank_index),
    CONSTRAINT family_ranks_index_non_negative CHECK (rank_index >= 0)
);

CREATE TABLE IF NOT EXISTS family_members (
    family_id      BIGINT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    character_id   INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    rank_id        BIGINT NOT NULL REFERENCES family_ranks(id) ON DELETE RESTRICT,
    contribution   INTEGER NOT NULL DEFAULT 0,
    joined_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY(family_id, character_id),
    CONSTRAINT family_members_contribution_non_negative CHECK (contribution >= 0)
);
CREATE UNIQUE INDEX IF NOT EXISTS family_members_one_family_per_character
    ON family_members(character_id);

CREATE TABLE IF NOT EXISTS family_contracts (
    id              BIGSERIAL PRIMARY KEY,
    family_id       BIGINT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    contract_key    VARCHAR(64) NOT NULL,
    progress        INTEGER NOT NULL DEFAULT 0,
    target          INTEGER NOT NULL,
    reward_money    NUMERIC(14,2) NOT NULL DEFAULT 0,
    reward_reputation INTEGER NOT NULL DEFAULT 0,
    expires_at      TIMESTAMPTZ NOT NULL,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT family_contracts_progress_non_negative CHECK (progress >= 0),
    CONSTRAINT family_contracts_target_positive CHECK (target > 0),
    CONSTRAINT family_contracts_rewards_non_negative CHECK (reward_money >= 0 AND reward_reputation >= 0)
);
CREATE INDEX IF NOT EXISTS family_contracts_family_active_idx
    ON family_contracts(family_id, expires_at DESC);

CREATE TABLE IF NOT EXISTS job_progress (
    character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    job_key      VARCHAR(48) NOT NULL,
    level        SMALLINT NOT NULL DEFAULT 1,
    experience   INTEGER NOT NULL DEFAULT 0,
    completed    INTEGER NOT NULL DEFAULT 0,
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY(character_id, job_key),
    CONSTRAINT job_progress_values_non_negative CHECK (level > 0 AND experience >= 0 AND completed >= 0)
);

CREATE TABLE IF NOT EXISTS economy_ledger (
    id            BIGSERIAL PRIMARY KEY,
    character_id  INTEGER REFERENCES characters(id) ON DELETE SET NULL,
    family_id     BIGINT REFERENCES families(id) ON DELETE SET NULL,
    source        VARCHAR(48) NOT NULL,
    direction     VARCHAR(8) NOT NULL,
    amount        NUMERIC(14,2) NOT NULL,
    metadata      JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT economy_ledger_direction_valid CHECK (direction IN ('mint','sink','move')),
    CONSTRAINT economy_ledger_amount_positive CHECK (amount > 0)
);
CREATE INDEX IF NOT EXISTS economy_ledger_created_idx ON economy_ledger(created_at DESC);
