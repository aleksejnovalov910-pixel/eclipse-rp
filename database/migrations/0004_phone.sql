-- Phone identity, contacts and direct messages.
-- Number is deterministic and unique per character, so concurrent first opens
-- cannot allocate the same number.

ALTER TABLE characters ADD COLUMN IF NOT EXISTS phone_number VARCHAR(10);

UPDATE characters
SET phone_number = (1000000 + id)::text
WHERE phone_number IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS characters_phone_number_key
  ON characters (phone_number) WHERE phone_number IS NOT NULL;

CREATE TABLE IF NOT EXISTS phone_contacts (
    id                  BIGSERIAL PRIMARY KEY,
    owner_character_id  INTEGER NOT NULL REFERENCES characters (id) ON DELETE CASCADE,
    phone_number        VARCHAR(10) NOT NULL,
    display_name        VARCHAR(40) NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (owner_character_id, phone_number)
);

CREATE INDEX IF NOT EXISTS phone_contacts_owner_idx ON phone_contacts (owner_character_id, display_name);

CREATE TABLE IF NOT EXISTS phone_messages (
    id                    BIGSERIAL PRIMARY KEY,
    sender_character_id   INTEGER NOT NULL REFERENCES characters (id) ON DELETE CASCADE,
    recipient_character_id INTEGER NOT NULL REFERENCES characters (id) ON DELETE CASCADE,
    body                  VARCHAR(500) NOT NULL,
    read_at               TIMESTAMPTZ,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT phone_messages_body_nonempty CHECK (char_length(trim(body)) > 0)
);

CREATE INDEX IF NOT EXISTS phone_messages_sender_idx
  ON phone_messages (sender_character_id, created_at DESC);
CREATE INDEX IF NOT EXISTS phone_messages_recipient_idx
  ON phone_messages (recipient_character_id, created_at DESC);
