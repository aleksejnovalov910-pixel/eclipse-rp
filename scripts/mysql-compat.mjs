export const mysqlize = (source, file = '') => {
  let sql = source.replace(/\r\n/g, '\n');
  sql = sql.replace(/CREATE EXTENSION[^;]+;/gi, '');
  sql = sql.replace(/::jsonb/gi, '');
  sql = sql.replace(/::text/gi, '');
  sql = sql.replace(/::uuid/gi, '');
  sql = sql.replace(/\bTIMESTAMPTZ\b/gi, 'DATETIME(3)');
  sql = sql.replace(/\bBIGSERIAL\b/gi, 'BIGINT AUTO_INCREMENT');
  sql = sql.replace(/\bSERIAL\b/gi, 'INT AUTO_INCREMENT');
  sql = sql.replace(/\bJSONB\b/gi, 'JSON');
  sql = sql.replace(/\bUUID\b/gi, 'CHAR(36)');
  sql = sql.replace(/gen_random_uuid\(\)/gi, 'UUID()');
  sql = sql.replace(/\bNOW\(\)/gi, 'CURRENT_TIMESTAMP(3)');
  sql = sql.replace(/DEFAULT\s+'\{\}'(?=\s|,|\))/gi, 'DEFAULT (JSON_OBJECT())');
  sql = sql.replace(/DEFAULT\s+'\[\]'(?=\s|,|\))/gi, 'DEFAULT (JSON_ARRAY())');
  sql = sql.replace(/CREATE\s+(UNIQUE\s+)?INDEX\s+IF\s+NOT\s+EXISTS/gi, 'CREATE $1INDEX');
  sql = sql.replace(/ALTER TABLE\s+([^\s]+)\s+ADD COLUMN IF NOT EXISTS/gi, 'ALTER TABLE $1 ADD COLUMN');
  sql = sql.replace(/\bBOOLEAN\b/gi, 'TINYINT(1)');
  sql = sql.replace(/\bTRUE\b/gi, '1').replace(/\bFALSE\b/gi, '0');
  sql = sql.replace(/INSERT\s+INTO([\s\S]*?)ON\s+CONFLICT\s+DO\s+NOTHING\s*;/gi, 'INSERT IGNORE INTO$1;');

  // MySQL reserved identifiers used by the existing portable Kysely schema.
  sql = sql.replace(/(^|\n)(\s*)key(\s+VARCHAR\s*\([^\n]+)/gi, '$1$2`key`$3');
  sql = sql.replace(/item_definitions\s*\(\s*key\s*\)/gi, 'item_definitions(`key`)');

  if (file === '0001_init.sql') {
    sql = sql.replace(/CREATE UNIQUE INDEX characters_account_slot_key[\s\S]*?WHERE deleted_at IS NULL;/i,
      "ALTER TABLE characters ADD COLUMN active_slot SMALLINT GENERATED ALWAYS AS (CASE WHEN deleted_at IS NULL THEN slot ELSE NULL END) STORED;\nCREATE UNIQUE INDEX characters_account_slot_key ON characters(account_id, active_slot);");
    sql = sql.replace(/CREATE UNIQUE INDEX characters_name_key[\s\S]*?WHERE deleted_at IS NULL;/i,
      "ALTER TABLE characters ADD COLUMN active_name VARCHAR(33) GENERATED ALWAYS AS (CASE WHEN deleted_at IS NULL THEN name_lower ELSE NULL END) STORED;\nCREATE UNIQUE INDEX characters_name_key ON characters(active_name);");
  }

  sql = sql.replace(/DO\s+\$\$[\s\S]*?\$\$\s*;/gi, '');
  return sql;
};
