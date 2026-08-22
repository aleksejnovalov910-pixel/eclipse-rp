INSERT INTO item_definitions(key,name,category,weight,stack_size,tradable,droppable,metadata) VALUES
('metal_scrap','Металлолом','material',0.350,50,TRUE,TRUE,'{}'::jsonb),
('rubber','Резина','material',0.200,50,TRUE,TRUE,'{}'::jsonb),
('cloth_roll','Ткань','material',0.180,50,TRUE,TRUE,'{}'::jsonb),
('medical_supplies','Медицинские материалы','material',0.150,50,TRUE,TRUE,'{}'::jsonb),
('electronic_parts','Электронные компоненты','material',0.120,50,TRUE,TRUE,'{}'::jsonb),
('raw_food','Продукты','material',0.300,50,TRUE,TRUE,'{}'::jsonb)
ON CONFLICT(key) DO UPDATE SET name=EXCLUDED.name,category=EXCLUDED.category,weight=EXCLUDED.weight,stack_size=EXCLUDED.stack_size,tradable=EXCLUDED.tradable,droppable=EXCLUDED.droppable;

CREATE TABLE IF NOT EXISTS crafting_stations(
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 key VARCHAR(48) NOT NULL UNIQUE,
 kind VARCHAR(32) NOT NULL CHECK(kind IN ('workbench','medical','kitchen','electronics')),
 name VARCHAR(96) NOT NULL,
 position_x NUMERIC(12,3) NOT NULL,
 position_y NUMERIC(12,3) NOT NULL,
 position_z NUMERIC(12,3) NOT NULL,
 radius NUMERIC(6,2) NOT NULL DEFAULT 4 CHECK(radius>0),
 enabled BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE TABLE IF NOT EXISTS crafting_recipes(
 key VARCHAR(64) PRIMARY KEY,
 station_kind VARCHAR(32) NOT NULL CHECK(station_kind IN ('workbench','medical','kitchen','electronics')),
 name VARCHAR(96) NOT NULL,
 output_item_key VARCHAR(64) NOT NULL REFERENCES item_definitions(key) ON DELETE RESTRICT,
 output_quantity INTEGER NOT NULL CHECK(output_quantity>0),
 duration_seconds INTEGER NOT NULL CHECK(duration_seconds BETWEEN 1 AND 3600),
 level_required INTEGER NOT NULL DEFAULT 1 CHECK(level_required BETWEEN 1 AND 100),
 enabled BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE TABLE IF NOT EXISTS crafting_recipe_inputs(
 recipe_key VARCHAR(64) NOT NULL REFERENCES crafting_recipes(key) ON DELETE CASCADE,
 item_key VARCHAR(64) NOT NULL REFERENCES item_definitions(key) ON DELETE RESTRICT,
 quantity INTEGER NOT NULL CHECK(quantity>0),
 PRIMARY KEY(recipe_key,item_key)
);
CREATE TABLE IF NOT EXISTS crafting_orders(
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
 station_id UUID NOT NULL REFERENCES crafting_stations(id) ON DELETE RESTRICT,
 recipe_key VARCHAR(64) NOT NULL REFERENCES crafting_recipes(key) ON DELETE RESTRICT,
 batches INTEGER NOT NULL CHECK(batches BETWEEN 1 AND 20),
 status VARCHAR(16) NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','claimed','cancelled')),
 ready_at TIMESTAMPTZ NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 claimed_at TIMESTAMPTZ NULL
);
CREATE INDEX IF NOT EXISTS crafting_orders_character_idx ON crafting_orders(character_id,status,ready_at DESC);

INSERT INTO crafting_stations(key,kind,name,position_x,position_y,position_z,radius) VALUES
('la_workbench','workbench','Городская мастерская',274.21,-3015.38,5.70,5),
('pillbox_lab','medical','Медицинская лаборатория',307.18,-595.31,43.28,4),
('vespucci_kitchen','kitchen','Производственная кухня',-1193.11,-892.38,13.99,4),
('tech_bench','electronics','Электронная мастерская',1275.10,-1710.26,54.77,4)
ON CONFLICT(key) DO UPDATE SET kind=EXCLUDED.kind,name=EXCLUDED.name,position_x=EXCLUDED.position_x,position_y=EXCLUDED.position_y,position_z=EXCLUDED.position_z,radius=EXCLUDED.radius,enabled=TRUE;

INSERT INTO crafting_recipes(key,station_kind,name,output_item_key,output_quantity,duration_seconds,level_required) VALUES
('repair_kit_basic','workbench','Ремкомплект','repair_kit',1,45,1),
('fuel_can_basic','workbench','Канистра','fuel_can',1,35,1),
('first_aid_basic','medical','Малая аптечка','first_aid_small',1,40,1),
('sandwich_batch','kitchen','Сэндвичи','sandwich',3,25,1),
('phone_basic_build','electronics','Смартфон','phone_basic',1,75,2)
ON CONFLICT(key) DO UPDATE SET station_kind=EXCLUDED.station_kind,name=EXCLUDED.name,output_item_key=EXCLUDED.output_item_key,output_quantity=EXCLUDED.output_quantity,duration_seconds=EXCLUDED.duration_seconds,level_required=EXCLUDED.level_required,enabled=TRUE;

INSERT INTO crafting_recipe_inputs(recipe_key,item_key,quantity) VALUES
('repair_kit_basic','metal_scrap',4),('repair_kit_basic','rubber',2),
('fuel_can_basic','metal_scrap',2),('fuel_can_basic','rubber',1),
('first_aid_basic','cloth_roll',3),('first_aid_basic','medical_supplies',2),
('sandwich_batch','raw_food',4),
('phone_basic_build','electronic_parts',5),('phone_basic_build','metal_scrap',1)
ON CONFLICT(recipe_key,item_key) DO UPDATE SET quantity=EXCLUDED.quantity;

INSERT INTO business_products(business_id,item_key,base_price)
SELECT b.id,p.item_key,p.base_price FROM businesses b CROSS JOIN (VALUES
('metal_scrap',90::numeric),('rubber',75::numeric),('cloth_roll',65::numeric),('medical_supplies',120::numeric),('electronic_parts',180::numeric),('raw_food',45::numeric)
) AS p(item_key,base_price) WHERE b.kind='store'
ON CONFLICT(business_id,item_key) DO UPDATE SET base_price=EXCLUDED.base_price,enabled=TRUE;
