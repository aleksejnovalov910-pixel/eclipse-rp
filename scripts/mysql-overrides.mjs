export const applyMysqlOverride = (file, input) => {
  // MySQL accepts expression defaults only when wrapped in parentheses.
  let sql = input.replace(/DEFAULT\s+UUID\(\)/gi, 'DEFAULT (UUID())');

  if (file === '0016_documents_criminal.sql') {
    sql = sql.replace(/INSERT(?: IGNORE)? INTO criminal_faction_ranks[\s\S]*?;/i,
`INSERT IGNORE INTO criminal_faction_ranks(faction_id,rank_index,name,permissions)
SELECT f.id,r.rank_index,r.name,r.permissions FROM criminal_factions f JOIN (
 SELECT 'ballas' faction_key,0 rank_index,'Youngster' name,'{}' permissions UNION ALL
 SELECT 'ballas',1,'Gangster','{"stash":true}' UNION ALL SELECT 'ballas',2,'OG','{"stash":true,"invite":true,"contracts":true}' UNION ALL SELECT 'ballas',3,'Boss','{"all":true}' UNION ALL
 SELECT 'vagos',0,'Novato','{}' UNION ALL SELECT 'vagos',1,'Soldado','{"stash":true}' UNION ALL SELECT 'vagos',2,'Veterano','{"stash":true,"invite":true,"contracts":true}' UNION ALL SELECT 'vagos',3,'Jefe','{"all":true}' UNION ALL
 SELECT 'families',0,'Young G','{}' UNION ALL SELECT 'families',1,'Hustler','{"stash":true}' UNION ALL SELECT 'families',2,'OG','{"stash":true,"invite":true,"contracts":true}' UNION ALL SELECT 'families',3,'Shot Caller','{"all":true}' UNION ALL
 SELECT 'marabunta',0,'Novato','{}' UNION ALL SELECT 'marabunta',1,'Soldado','{"stash":true}' UNION ALL SELECT 'marabunta',2,'Veterano','{"stash":true,"invite":true,"contracts":true}' UNION ALL SELECT 'marabunta',3,'Jefe','{"all":true}'
) r ON r.faction_key=f.\`key\`;`);
  }

  if (file === '0019_police_custody.sql') sql = sql.replace(/\s+WHERE jailed_until IS NOT NULL(?=;)/i, '');
  if (file === '0020_medical_state.sql') sql = sql.replace(/\s+WHERE downed = 1(?=;)/i, '');

  if (file === '0021_organization_assets.sql') {
    sql = sql.replace(/ALTER TABLE inventories DROP CONSTRAINT IF EXISTS inventories_owner_type_valid;[\s\S]*?CHECK \(owner_type IN \([^;]+?\)\);/i, '');
    sql = sql.replace(/UNIQUE\(organization_id,key,gender\)/i, 'UNIQUE(organization_id,`key`,gender)');
    sql = sql.replace(/INSERT(?: IGNORE)? INTO organization_vehicles[\s\S]*?;/i,
`INSERT IGNORE INTO organization_vehicles(organization_id,model,name,plate,min_rank,position_x,position_y,position_z,heading)
SELECT o.id,v.model,v.name,v.plate,v.min_rank,v.x,v.y,v.z,v.h FROM organizations o JOIN (
 SELECT 'lspd' org_key,'police3' model,'Police Interceptor' name,'LSPD01' plate,0 min_rank,-445.2 x,6007.4 y,31.7 z,45.0 h UNION ALL
 SELECT 'lspd','police4','Police Cruiser','LSPD02',1,-449.0,6011.0,31.7,45.0 UNION ALL SELECT 'ems','ambulance','Ambulance','EMS01',0,294.5,-610.8,43.4,70.0 UNION ALL
 SELECT 'ems','granger','EMS Supervisor','EMS02',2,290.5,-607.0,43.4,70.0 UNION ALL SELECT 'gov','schafter2','Government Sedan','GOV01',0,-543.0,-204.0,38.2,210.0
) v ON v.org_key=o.\`key\`;`);
    sql = sql.replace(/INSERT(?: IGNORE)? INTO organization_uniforms[\s\S]*?;/i,
`INSERT IGNORE INTO organization_uniforms(organization_id,\`key\`,name,gender,min_rank,components)
SELECT o.id,u.uniform_key,u.name,u.gender,u.min_rank,u.components FROM organizations o JOIN (
 SELECT 'lspd' org_key,'patrol' uniform_key,'Patrol uniform' name,'male' gender,0 min_rank,'{"3":{"drawable":0,"texture":0},"4":{"drawable":35,"texture":0},"6":{"drawable":25,"texture":0},"8":{"drawable":58,"texture":0},"11":{"drawable":55,"texture":0}}' components UNION ALL
 SELECT 'lspd','patrol','Patrol uniform','female',0,'{"3":{"drawable":14,"texture":0},"4":{"drawable":34,"texture":0},"6":{"drawable":25,"texture":0},"8":{"drawable":35,"texture":0},"11":{"drawable":48,"texture":0}}' UNION ALL
 SELECT 'ems','paramedic','Paramedic uniform','male',0,'{"4":{"drawable":20,"texture":0},"6":{"drawable":25,"texture":0},"8":{"drawable":15,"texture":0},"11":{"drawable":250,"texture":0}}' UNION ALL
 SELECT 'ems','paramedic','Paramedic uniform','female',0,'{"4":{"drawable":23,"texture":0},"6":{"drawable":25,"texture":0},"8":{"drawable":14,"texture":0},"11":{"drawable":258,"texture":0}}' UNION ALL SELECT 'gov','office','Government suit','unisex',0,'{}'
) u ON u.org_key=o.\`key\`;`);
  }

  if (file === '0022_family_assets.sql') sql = sql.replace(/\s+WHERE owner_family_id IS NOT NULL(?=;)/i, '');

  if (file === '0024_business_management.sql') {
    sql = sql.replace(/INSERT(?: IGNORE)? INTO business_upgrades\(business_id,upgrade_key\)[\s\S]*?;/i,
`INSERT IGNORE INTO business_upgrades(business_id,upgrade_key)
SELECT b.id,u.upgrade_key FROM businesses b JOIN (SELECT 'storage' upgrade_key UNION ALL SELECT 'efficiency' UNION ALL SELECT 'security') u;`);
  }

  if (file === '0025_marketplace_expansion.sql') {
    sql = sql.replace(/ALTER TABLE marketplace_listings DROP CONSTRAINT IF EXISTS marketplace_listings_object_type_check;\s*/i, '');
    sql = sql.replace(/ALTER TABLE marketplace_listings ADD CONSTRAINT marketplace_listings_object_type_check CHECK \([^;]+;\s*/i, '');
    sql = sql.replace(/CREATE INDEX marketplace_title_search_idx ON marketplace_listings USING gin \(to_tsvector\('simple',title\)\);/i,
      'CREATE FULLTEXT INDEX marketplace_title_search_idx ON marketplace_listings(title);');
  }

  if (file === '0027_crafting_production.sql') {
    sql = sql.replace(/INSERT INTO business_products\(business_id,item_key,base_price\)[\s\S]*?ON DUPLICATE KEY UPDATE base_price=VALUES\(base_price\),enabled=1;/i,
`INSERT INTO business_products(business_id,item_key,base_price)
SELECT b.id,p.item_key,p.base_price FROM businesses b JOIN (
 SELECT 'metal_scrap' item_key,90 base_price UNION ALL SELECT 'rubber',75 UNION ALL SELECT 'cloth_roll',65 UNION ALL
 SELECT 'medical_supplies',120 UNION ALL SELECT 'electronic_parts',180 UNION ALL SELECT 'raw_food',45
) p WHERE b.kind='store' ON DUPLICATE KEY UPDATE base_price=VALUES(base_price),enabled=1;`);
  }

  if (file === '0028_weapon_shops.sql') {
    sql = sql.replace(/INSERT INTO weapon_shop_products\(shop_id,kind,weapon_key,name,amount,price,level_required\)[\s\S]*?;/i,
`INSERT INTO weapon_shop_products(shop_id,kind,weapon_key,name,amount,price,level_required)
SELECT s.id,v.kind,v.weapon_key,v.name,v.amount,v.price,v.level_required FROM weapon_shops s JOIN (
 SELECT 'weapon' kind,'pistol' weapon_key,'Пистолет' name,24 amount,15000.00 price,1 level_required UNION ALL
 SELECT 'ammo','pistol','Патроны 9×19 · 48',48,1800.00,1 UNION ALL SELECT 'weapon','combat_pistol','Боевой пистолет',24,26000.00,3 UNION ALL
 SELECT 'ammo','combat_pistol','Патроны 9×19 · 48',48,1800.00,3 UNION ALL SELECT 'weapon','pump_shotgun','Помповый дробовик',12,42000.00,5 UNION ALL
 SELECT 'ammo','pump_shotgun','Патроны 12 калибр · 24',24,2800.00,5 UNION ALL SELECT 'armour',NULL,'Бронежилет',50,7500.00,1
) v WHERE s.\`key\` IN('pillbox_ammu','vespucci_ammu') AND NOT EXISTS(SELECT 1 FROM weapon_shop_products p WHERE p.shop_id=s.id AND p.kind=v.kind AND p.name=v.name);`);
  }

  if (file === '0032_runtime_recovery.sql') sql = sql.replace(/\s+WHERE expires_at IS NOT NULL(?=;)/i, '');
  return sql;
};
