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

  sql = sql.replace(/DO\s+\$\$[\s\S]*?\$\$\s*;/gi, '');
  return sql;
};
