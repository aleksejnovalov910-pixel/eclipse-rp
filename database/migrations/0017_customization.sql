CREATE TABLE IF NOT EXISTS customization_shops (
  id BIGSERIAL PRIMARY KEY,
  key VARCHAR(48) NOT NULL UNIQUE,
  kind VARCHAR(24) NOT NULL CHECK (kind IN ('clothing','barber','tattoo')),
  name VARCHAR(96) NOT NULL,
  position_x NUMERIC(12,4) NOT NULL,
  position_y NUMERIC(12,4) NOT NULL,
  position_z NUMERIC(12,4) NOT NULL,
  radius NUMERIC(8,2) NOT NULL DEFAULT 8 CHECK(radius>0)
);

CREATE TABLE IF NOT EXISTS clothing_catalog (
  key VARCHAR(64) PRIMARY KEY,
  gender VARCHAR(12) NOT NULL CHECK(gender IN ('male','female','unisex')),
  category VARCHAR(32) NOT NULL,
  component_id SMALLINT NOT NULL CHECK(component_id BETWEEN 0 AND 11),
  drawable SMALLINT NOT NULL CHECK(drawable>=0),
  texture SMALLINT NOT NULL DEFAULT 0 CHECK(texture>=0),
  name VARCHAR(96) NOT NULL,
  price NUMERIC(14,2) NOT NULL CHECK(price>=0),
  enabled BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS character_clothing_owned (
  character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  item_key VARCHAR(64) NOT NULL REFERENCES clothing_catalog(key) ON DELETE RESTRICT,
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(character_id,item_key)
);

CREATE TABLE IF NOT EXISTS character_outfit_state (
  character_id INTEGER PRIMARY KEY REFERENCES characters(id) ON DELETE CASCADE,
  components JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO customization_shops(key,kind,name,position_x,position_y,position_z,radius) VALUES
 ('ponsonbys_portola','clothing','Ponsonbys — Portola Drive',-709.8,-153.2,37.4,12),
 ('suburban_hawick','clothing','Sub Urban — Hawick',124.8,-219.8,54.6,12),
 ('barber_hawick','barber','Bob Mulét — Hawick',-814.3,-183.8,37.6,10),
 ('tattoo_vespucci','tattoo','Ink Inc. — Vespucci',1322.6,-1651.9,52.3,10)
ON CONFLICT(key) DO NOTHING;

INSERT INTO clothing_catalog(key,gender,category,component_id,drawable,texture,name,price) VALUES
 ('m_top_basic_0','male','top',11,0,0,'Базовая футболка',2500),
 ('m_top_basic_1','male','top',11,5,0,'Повседневная футболка',4200),
 ('m_legs_basic_0','male','legs',4,0,0,'Классические брюки',3800),
 ('m_legs_basic_1','male','legs',4,5,0,'Повседневные брюки',5200),
 ('m_shoes_basic_0','male','shoes',6,1,0,'Кеды',3100),
 ('m_shoes_basic_1','male','shoes',6,5,0,'Ботинки',6200),
 ('f_top_basic_0','female','top',11,0,0,'Базовый верх',2500),
 ('f_top_basic_1','female','top',11,5,0,'Повседневный верх',4200),
 ('f_legs_basic_0','female','legs',4,0,0,'Классические брюки',3800),
 ('f_legs_basic_1','female','legs',4,5,0,'Повседневные брюки',5200),
 ('f_shoes_basic_0','female','shoes',6,1,0,'Кеды',3100),
 ('f_shoes_basic_1','female','shoes',6,5,0,'Ботинки',6200)
ON CONFLICT(key) DO NOTHING;