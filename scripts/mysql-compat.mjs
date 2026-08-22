export const mysqlize = (source, file = '') => {
  let sql = source.replace(/\r\n/g, '\n');
  sql = sql.replace(/CREATE EXTENSION[^;]+;/gi, '');
  sql = sql.replace(/::jsonb/gi, '').replace(/::text/gi, '').replace(/::uuid/gi, '').replace(/::numeric/gi, '');
  sql = sql.replace(/\bTIMESTAMPTZ\b/gi, 'DATETIME(3)');
  sql = sql.replace(/\bBIGSERIAL\b/gi, 'BIGINT AUTO_INCREMENT');
  sql = sql.replace(/\bSERIAL\b/gi, 'INT AUTO_INCREMENT');
  sql = sql.replace(/\bJSONB\b/gi, 'JSON');
  sql = sql.replace(/\bUUID\b/gi, 'CHAR(36)');
  sql = sql.replace(/gen_random_uuid\(\)/gi, 'UUID()');
  sql = sql.replace(/\bNOW\(\)/gi, 'CURRENT_TIMESTAMP(3)');
  sql = sql.replace(/CURRENT_TIMESTAMP\(3\)\s*\+\s*INTERVAL\s*'([0-9]+)\s+days?'/gi, 'DATE_ADD(CURRENT_TIMESTAMP(3), INTERVAL $1 DAY)');
  sql = sql.replace(/CURRENT_TIMESTAMP\(3\)\s*\+\s*INTERVAL\s*'([0-9]+)\s+hours?'/gi, 'DATE_ADD(CURRENT_TIMESTAMP(3), INTERVAL $1 HOUR)');
  sql = sql.replace(/DEFAULT\s+'\{\}'(?=\s|,|\))/gi, 'DEFAULT (JSON_OBJECT())');
  sql = sql.replace(/DEFAULT\s+'\[\]'(?=\s|,|\))/gi, 'DEFAULT (JSON_ARRAY())');
  sql = sql.replace(/CREATE\s+(UNIQUE\s+)?INDEX\s+IF\s+NOT\s+EXISTS/gi, 'CREATE $1INDEX');
  sql = sql.replace(/ALTER TABLE\s+([^\s]+)\s+ADD COLUMN IF NOT EXISTS/gi, 'ALTER TABLE $1 ADD COLUMN');
  sql = sql.replace(/\bBOOLEAN\b/gi, 'TINYINT(1)');
  sql = sql.replace(/\bTRUE\b/gi, '1').replace(/\bFALSE\b/gi, '0');

  sql = sql.replace(/ON\s+CONFLICT\s*\([^)]*\)\s+DO\s+UPDATE\s+SET/gi, 'ON DUPLICATE KEY UPDATE');
  sql = sql.replace(/EXCLUDED\.([a-zA-Z_][a-zA-Z0-9_]*)/g, 'VALUES($1)');
  sql = sql.replace(/INSERT\s+INTO([\s\S]*?)ON\s+CONFLICT(?:\s*\([^)]*\))?\s+DO\s+NOTHING\s*;/gi, 'INSERT IGNORE INTO$1;');

  sql = sql.replace(/(^|\n)(\s*)key(\s+VARCHAR\s*\([^\n]+)/gi, '$1$2`key`$3');
  sql = sql.replace(/\(\s*key\s*([,)])/gi, '(`key`$1');
  sql = sql.replace(/\.key\b/gi, '.`key`');
  sql = sql.replace(/(CREATE\s+UNIQUE\s+INDEX\s+[^;\n]+(?:\n\s*)?ON\s+[^;]+?\([^;]+?\))\s+WHERE\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+IS\s+NOT\s+NULL\s*;/gi, '$1;');

  if (file === '0001_init.sql') {
    sql = sql.replace(/CREATE UNIQUE INDEX characters_account_slot_key[\s\S]*?WHERE deleted_at IS NULL;/i,
      "ALTER TABLE characters ADD COLUMN active_slot SMALLINT GENERATED ALWAYS AS (CASE WHEN deleted_at IS NULL THEN slot ELSE NULL END) STORED;\nCREATE UNIQUE INDEX characters_account_slot_key ON characters(account_id, active_slot);");
    sql = sql.replace(/CREATE UNIQUE INDEX characters_name_key[\s\S]*?WHERE deleted_at IS NULL;/i,
      "ALTER TABLE characters ADD COLUMN active_name VARCHAR(33) GENERATED ALWAYS AS (CASE WHEN deleted_at IS NULL THEN name_lower ELSE NULL END) STORED;\nCREATE UNIQUE INDEX characters_name_key ON characters(active_name);");
  }

  if (file === '0007_businesses.sql') {
    sql = sql.replace(/INSERT INTO businesses\(kind,name,price,stock,stock_capacity,wholesale_unit_cost,markup_percent,position_x,position_y,position_z\)[\s\S]*?WHERE NOT EXISTS \(SELECT 1 FROM businesses\);/i,
`INSERT INTO businesses(kind,name,price,stock,stock_capacity,wholesale_unit_cost,markup_percent,position_x,position_y,position_z) VALUES
 ('store','24/7 Strawberry',850000,180,500,55,30,-47.15,-1758.66,29.42),
 ('fuel','АЗС Route 68',1250000,300,800,42,24,1208.47,2660.15,37.90),
 ('clothing','Binco Textile City',1100000,140,400,125,40,425.24,-806.09,29.49),
 ('barber','Barbershop Vespucci',720000,90,250,80,35,-814.31,-183.82,37.57);`);
  }

  if (file === '0008_marketplace.sql') {
    sql = sql.replace(/CREATE UNIQUE INDEX marketplace_active_object_uq ON marketplace_listings\(object_type,object_id\) WHERE status='active';/i,
      "ALTER TABLE marketplace_listings ADD COLUMN active_object_key VARCHAR(128) GENERATED ALWAYS AS (CASE WHEN status='active' THEN CONCAT(object_type,':',object_id) ELSE NULL END) STORED;\nCREATE UNIQUE INDEX marketplace_active_object_uq ON marketplace_listings(active_object_key);");
  }

  if (file === '0010_marketplace_object_ids.sql') {
    sql = `ALTER TABLE marketplace_listings MODIFY COLUMN object_id VARCHAR(64) NOT NULL;`;
  }

  if (file === '0011_dealerships.sql') {
    sql = `CREATE TABLE IF NOT EXISTS dealerships (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()), name VARCHAR(96) NOT NULL,
  position_x DECIMAL(12,4) NOT NULL, position_y DECIMAL(12,4) NOT NULL, position_z DECIMAL(12,4) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
);
CREATE TABLE IF NOT EXISTS dealership_offers (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()), dealership_id CHAR(36) NOT NULL,
  model VARCHAR(64) NOT NULL, display_name VARCHAR(96) NOT NULL,
  price DECIMAL(14,2) NOT NULL CHECK(price>0), stock INT NOT NULL DEFAULT 10 CHECK(stock>=0),
  enabled TINYINT(1) NOT NULL DEFAULT 1, created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT dealership_offers_dealer_fk FOREIGN KEY(dealership_id) REFERENCES dealerships(id) ON DELETE CASCADE
);
CREATE INDEX dealership_offers_dealer_idx ON dealership_offers(dealership_id,enabled);
INSERT INTO dealerships(id,name,position_x,position_y,position_z)
SELECT '11000000-0000-4000-8000-000000000001','Premium Deluxe Motorsport',-33.74,-1102.01,26.42
WHERE NOT EXISTS(SELECT 1 FROM dealerships);
INSERT IGNORE INTO dealership_offers(id,dealership_id,model,display_name,price,stock) VALUES
 ('11100000-0000-4000-8000-000000000001','11000000-0000-4000-8000-000000000001','sultan','Karin Sultan',95000,15),
 ('11100000-0000-4000-8000-000000000002','11000000-0000-4000-8000-000000000001','tailgater','Obey Tailgater',145000,12),
 ('11100000-0000-4000-8000-000000000003','11000000-0000-4000-8000-000000000001','schafter2','Benefactor Schafter',220000,10),
 ('11100000-0000-4000-8000-000000000004','11000000-0000-4000-8000-000000000001','baller','Gallivanter Baller',310000,8);`;
  }

  if (file === '0012_store_products.sql') {
    sql = `CREATE TABLE IF NOT EXISTS business_products (
  business_id CHAR(36) NOT NULL, item_key VARCHAR(64) NOT NULL,
  base_price DECIMAL(14,2) NOT NULL CHECK(base_price>0), enabled TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY(business_id,item_key),
  CONSTRAINT business_products_business_fk FOREIGN KEY(business_id) REFERENCES businesses(id) ON DELETE CASCADE,
  CONSTRAINT business_products_item_fk FOREIGN KEY(item_key) REFERENCES item_definitions(\`key\`) ON DELETE RESTRICT
);
INSERT INTO business_products(business_id,item_key,base_price)
SELECT b.id,p.item_key,p.base_price FROM businesses b JOIN (
 SELECT 'water_bottle' item_key,18 base_price UNION ALL SELECT 'sandwich',32 UNION ALL
 SELECT 'first_aid_small',145 UNION ALL SELECT 'repair_kit',650 UNION ALL SELECT 'fuel_can',420
) p WHERE b.kind='store'
ON DUPLICATE KEY UPDATE base_price=VALUES(base_price),enabled=1;`;
  }

  if (file === '0014_organizations.sql') {
    sql = `CREATE TABLE IF NOT EXISTS organizations (
 id BIGINT AUTO_INCREMENT PRIMARY KEY, \`key\` VARCHAR(48) NOT NULL UNIQUE, name VARCHAR(96) NOT NULL, kind VARCHAR(32) NOT NULL,
 color INT NOT NULL DEFAULT 0, settings JSON NOT NULL DEFAULT (JSON_OBJECT()), created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
);
CREATE TABLE IF NOT EXISTS organization_ranks (
 id BIGINT AUTO_INCREMENT PRIMARY KEY, organization_id BIGINT NOT NULL, rank_index SMALLINT NOT NULL, name VARCHAR(48) NOT NULL,
 salary DECIMAL(14,2) NOT NULL DEFAULT 0 CHECK(salary>=0), permissions JSON NOT NULL DEFAULT (JSON_OBJECT()), UNIQUE(organization_id,rank_index),
 CONSTRAINT organization_ranks_org_fk FOREIGN KEY(organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS organization_members (
 organization_id BIGINT NOT NULL, character_id INT NOT NULL, rank_id BIGINT NOT NULL, on_duty TINYINT(1) NOT NULL DEFAULT 0,
 joined_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), PRIMARY KEY(organization_id,character_id),
 CONSTRAINT organization_members_org_fk FOREIGN KEY(organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
 CONSTRAINT organization_members_character_fk FOREIGN KEY(character_id) REFERENCES characters(id) ON DELETE CASCADE,
 CONSTRAINT organization_members_rank_fk FOREIGN KEY(rank_id) REFERENCES organization_ranks(id) ON DELETE RESTRICT
);
CREATE UNIQUE INDEX organization_members_one_org_per_character ON organization_members(character_id);
CREATE TABLE IF NOT EXISTS organization_calls (
 id BIGINT AUTO_INCREMENT PRIMARY KEY, organization_kind VARCHAR(32) NOT NULL, caller_character_id INT NULL, assigned_character_id INT NULL,
 status VARCHAR(24) NOT NULL DEFAULT 'open', message VARCHAR(220) NOT NULL, position_x DECIMAL(12,4) NOT NULL, position_y DECIMAL(12,4) NOT NULL,
 position_z DECIMAL(12,4) NOT NULL, created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), closed_at DATETIME(3) NULL
);
CREATE INDEX organization_calls_kind_status_idx ON organization_calls(organization_kind,status,created_at DESC);
CREATE TABLE IF NOT EXISTS organization_audit_log (
 id BIGINT AUTO_INCREMENT PRIMARY KEY, organization_id BIGINT NULL, actor_character_id INT NULL, target_character_id INT NULL,
 action VARCHAR(64) NOT NULL, metadata JSON NOT NULL DEFAULT (JSON_OBJECT()), created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
);
INSERT IGNORE INTO organizations(\`key\`,name,kind,color) VALUES
 ('lspd','Los Santos Police Department','police',38),('ems','Emergency Medical Services','ems',1),('gov','Government of San Andreas','government',5);
INSERT IGNORE INTO organization_ranks(organization_id,rank_index,name,salary,permissions)
SELECT o.id,r.rank_index,r.name,r.salary,r.permissions FROM organizations o JOIN (
 SELECT 'lspd' org_key,0 rank_index,'Cadet' name,450 salary,'{\"duty\":true,\"calls\":true}' permissions UNION ALL
 SELECT 'lspd',1,'Officer',650,'{\"duty\":true,\"calls\":true,\"mdt\":true}' UNION ALL SELECT 'lspd',2,'Sergeant',900,'{\"duty\":true,\"calls\":true,\"mdt\":true,\"manage_members\":true}' UNION ALL SELECT 'lspd',3,'Chief',1400,'{\"all\":true}' UNION ALL
 SELECT 'ems',0,'Intern',450,'{\"duty\":true,\"calls\":true}' UNION ALL SELECT 'ems',1,'Paramedic',650,'{\"duty\":true,\"calls\":true,\"medical\":true}' UNION ALL SELECT 'ems',2,'Doctor',900,'{\"duty\":true,\"calls\":true,\"medical\":true,\"manage_members\":true}' UNION ALL SELECT 'ems',3,'Chief Physician',1400,'{\"all\":true}' UNION ALL
 SELECT 'gov',0,'Clerk',500,'{\"duty\":true}' UNION ALL SELECT 'gov',1,'Secretary',750,'{\"duty\":true,\"licenses\":true}' UNION ALL SELECT 'gov',2,'Minister',1100,'{\"duty\":true,\"licenses\":true,\"manage_members\":true}' UNION ALL SELECT 'gov',3,'Governor',1600,'{\"all\":true}'
) r ON r.org_key=o.\`key\`;`;
  }

  sql = sql.replace(/DO\s+\$\$[\s\S]*?\$\$\s*;/gi, '');
  return sql;
};
