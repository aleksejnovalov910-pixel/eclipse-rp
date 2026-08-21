CREATE TABLE IF NOT EXISTS weapon_shops(
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),key VARCHAR(48) NOT NULL UNIQUE,name VARCHAR(96) NOT NULL,
 position_x NUMERIC(12,3) NOT NULL,position_y NUMERIC(12,3) NOT NULL,position_z NUMERIC(12,3) NOT NULL,radius NUMERIC(6,2) NOT NULL DEFAULT 5 CHECK(radius>0),enabled BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE TABLE IF NOT EXISTS weapon_definitions(
 key VARCHAR(48) PRIMARY KEY,name VARCHAR(96) NOT NULL,weapon_name VARCHAR(64) NOT NULL UNIQUE,max_ammo INTEGER NOT NULL CHECK(max_ammo>0),license_required BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE TABLE IF NOT EXISTS weapon_shop_products(
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),shop_id UUID NOT NULL REFERENCES weapon_shops(id) ON DELETE CASCADE,
 kind VARCHAR(16) NOT NULL CHECK(kind IN('weapon','ammo','armour')),weapon_key VARCHAR(48) NULL REFERENCES weapon_definitions(key) ON DELETE RESTRICT,
 name VARCHAR(96) NOT NULL,amount INTEGER NOT NULL CHECK(amount>0),price NUMERIC(14,2) NOT NULL CHECK(price>0),level_required INTEGER NOT NULL DEFAULT 1 CHECK(level_required BETWEEN 1 AND 100),enabled BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE INDEX IF NOT EXISTS weapon_shop_products_shop_idx ON weapon_shop_products(shop_id,enabled);
CREATE TABLE IF NOT EXISTS character_weapons(
 character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,weapon_key VARCHAR(48) NOT NULL REFERENCES weapon_definitions(key) ON DELETE RESTRICT,
 ammo INTEGER NOT NULL DEFAULT 0 CHECK(ammo>=0),acquired_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),PRIMARY KEY(character_id,weapon_key)
);
INSERT INTO weapon_shops(key,name,position_x,position_y,position_z,radius) VALUES
('pillbox_ammu','Ammu-Nation · Pillbox',22.09,-1107.28,29.80,5),('vespucci_ammu','Ammu-Nation · Vespucci',810.22,-2157.49,29.62,5)
ON CONFLICT(key) DO UPDATE SET name=EXCLUDED.name,position_x=EXCLUDED.position_x,position_y=EXCLUDED.position_y,position_z=EXCLUDED.position_z,radius=EXCLUDED.radius,enabled=TRUE;
INSERT INTO weapon_definitions(key,name,weapon_name,max_ammo,license_required) VALUES
('pistol','Пистолет','weapon_pistol',250,TRUE),('combat_pistol','Боевой пистолет','weapon_combatpistol',250,TRUE),('pump_shotgun','Помповый дробовик','weapon_pumpshotgun',120,TRUE)
ON CONFLICT(key) DO UPDATE SET name=EXCLUDED.name,weapon_name=EXCLUDED.weapon_name,max_ammo=EXCLUDED.max_ammo,license_required=EXCLUDED.license_required;
INSERT INTO weapon_shop_products(shop_id,kind,weapon_key,name,amount,price,level_required)
SELECT s.id,v.kind,v.weapon_key,v.name,v.amount,v.price,v.level_required FROM weapon_shops s CROSS JOIN (VALUES
('weapon','pistol','Пистолет',24,15000.00,1),('ammo','pistol','Патроны 9×19 · 48',48,1800.00,1),('weapon','combat_pistol','Боевой пистолет',24,26000.00,3),('ammo','combat_pistol','Патроны 9×19 · 48',48,1800.00,3),('weapon','pump_shotgun','Помповый дробовик',12,42000.00,5),('ammo','pump_shotgun','Патроны 12 калибр · 24',24,2800.00,5),('armour',NULL,'Бронежилет',50,7500.00,1)
) AS v(kind,weapon_key,name,amount,price,level_required)
WHERE s.key IN('pillbox_ammu','vespucci_ammu') AND NOT EXISTS(SELECT 1 FROM weapon_shop_products p WHERE p.shop_id=s.id AND p.kind=v.kind AND p.name=v.name);
