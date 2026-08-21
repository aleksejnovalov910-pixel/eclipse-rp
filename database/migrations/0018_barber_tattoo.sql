CREATE TABLE IF NOT EXISTS barber_catalog (
  key VARCHAR(64) PRIMARY KEY,
  gender VARCHAR(12) NOT NULL CHECK(gender IN ('male','female','unisex')),
  category VARCHAR(24) NOT NULL CHECK(category IN ('hair','eyebrows','beard')),
  style SMALLINT NOT NULL CHECK(style >= -1),
  name VARCHAR(96) NOT NULL,
  price NUMERIC(14,2) NOT NULL CHECK(price >= 0),
  enabled BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS tattoo_catalog (
  key VARCHAR(64) PRIMARY KEY,
  gender VARCHAR(12) NOT NULL CHECK(gender IN ('male','female','unisex')),
  zone VARCHAR(24) NOT NULL,
  collection VARCHAR(64) NOT NULL,
  overlay VARCHAR(64) NOT NULL,
  name VARCHAR(96) NOT NULL,
  price NUMERIC(14,2) NOT NULL CHECK(price >= 0),
  enabled BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS character_tattoos (
  character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  tattoo_key VARCHAR(64) NOT NULL REFERENCES tattoo_catalog(key) ON DELETE RESTRICT,
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(character_id,tattoo_key)
);

INSERT INTO barber_catalog(key,gender,category,style,name,price) VALUES
 ('m_hair_1','male','hair',1,'Короткая классика',1800),
 ('m_hair_2','male','hair',2,'Fade',2600),
 ('m_hair_4','male','hair',4,'Зачёс назад',3200),
 ('f_hair_1','female','hair',1,'Короткое каре',1800),
 ('f_hair_3','female','hair',3,'Длинные волосы',2800),
 ('f_hair_5','female','hair',5,'Собранные волосы',3200),
 ('brows_0','unisex','eyebrows',0,'Естественные брови',900),
 ('brows_3','unisex','eyebrows',3,'Выразительные брови',1200),
 ('beard_none','male','beard',-1,'Без бороды',500),
 ('beard_1','male','beard',1,'Щетина',1100),
 ('beard_3','male','beard',3,'Короткая борода',1800)
ON CONFLICT(key) DO NOTHING;

INSERT INTO tattoo_catalog(key,gender,zone,collection,overlay,name,price) VALUES
 ('tat_arm_tribal_1','unisex','left_arm','mpbusiness_overlays','MP_Buis_M_LeftArm_000','Tribal — левая рука',6500),
 ('tat_arm_skull_1','male','right_arm','mphipster_overlays','FM_Hip_M_Tat_003','Череп — правая рука',8000),
 ('tat_chest_script_1','unisex','torso','mphipster_overlays','FM_Hip_M_Tat_006','Надпись — грудь',9500),
 ('tat_back_art_1','unisex','back','mpbusiness_overlays','MP_Buis_M_Back_000','Art — спина',12000)
ON CONFLICT(key) DO NOTHING;