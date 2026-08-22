-- Базовый каталог предметов. Каталог хранится в БД, чтобы серверная логика,
-- магазины, лут и UI использовали одни и те же определения.

INSERT INTO item_definitions (key, name, category, weight, stack_size, tradable, droppable, metadata)
VALUES
  ('phone_basic', 'Смартфон', 'device', 0.250, 1, TRUE, TRUE, '{"usable":true}'::jsonb),
  ('water_bottle', 'Вода', 'food', 0.500, 10, TRUE, TRUE, '{"thirst":25}'::jsonb),
  ('sandwich', 'Сэндвич', 'food', 0.350, 10, TRUE, TRUE, '{"hunger":25}'::jsonb),
  ('first_aid_small', 'Малая аптечка', 'medical', 0.750, 5, TRUE, TRUE, '{"heal":25}'::jsonb),
  ('bank_card', 'Банковская карта', 'document', 0.020, 1, FALSE, FALSE, '{"personal":true}'::jsonb),
  ('driver_license', 'Водительское удостоверение', 'document', 0.020, 1, FALSE, FALSE, '{"personal":true}'::jsonb),
  ('repair_kit', 'Ремкомплект', 'vehicle', 4.000, 2, TRUE, TRUE, '{"vehicleRepair":true}'::jsonb),
  ('fuel_can', 'Канистра топлива', 'vehicle', 8.000, 1, TRUE, TRUE, '{"fuel":20}'::jsonb)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  weight = EXCLUDED.weight,
  stack_size = EXCLUDED.stack_size,
  tradable = EXCLUDED.tradable,
  droppable = EXCLUDED.droppable,
  metadata = EXCLUDED.metadata;
