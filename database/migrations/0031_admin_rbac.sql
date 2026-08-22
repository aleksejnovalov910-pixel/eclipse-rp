CREATE TABLE IF NOT EXISTS admin_roles(
 key VARCHAR(32) PRIMARY KEY,
 name VARCHAR(64) NOT NULL,
 level SMALLINT NOT NULL CHECK(level BETWEEN 1 AND 10),
 permissions JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE TABLE IF NOT EXISTS account_admin_roles(
 account_id INTEGER PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
 role_key VARCHAR(32) NOT NULL REFERENCES admin_roles(key) ON DELETE RESTRICT,
 granted_by INTEGER NULL REFERENCES accounts(id) ON DELETE SET NULL,
 granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS admin_audit_log(
 id BIGSERIAL PRIMARY KEY,
 actor_account_id INTEGER NULL REFERENCES accounts(id) ON DELETE SET NULL,
 actor_character_id INTEGER NULL REFERENCES characters(id) ON DELETE SET NULL,
 target_account_id INTEGER NULL REFERENCES accounts(id) ON DELETE SET NULL,
 target_character_id INTEGER NULL REFERENCES characters(id) ON DELETE SET NULL,
 action VARCHAR(48) NOT NULL,
 reason VARCHAR(220) NULL,
 metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS admin_audit_created_idx ON admin_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS admin_audit_actor_idx ON admin_audit_log(actor_account_id,created_at DESC);
INSERT INTO admin_roles(key,name,level,permissions) VALUES
('moderator','Moderator',2,'{"players.view":true,"players.kick":true,"players.heal":true,"players.teleport":true}'::jsonb),
('administrator','Administrator',5,'{"players.view":true,"players.kick":true,"players.heal":true,"players.teleport":true,"players.ban":true,"audit.view":true}'::jsonb),
('owner','Owner',10,'{"all":true}'::jsonb)
ON CONFLICT(key) DO UPDATE SET name=EXCLUDED.name,level=EXCLUDED.level,permissions=EXCLUDED.permissions;
