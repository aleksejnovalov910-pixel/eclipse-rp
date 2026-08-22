import { sql } from 'kysely';
import type { InventoryView } from '@eclipse/shared';
import { db } from '../../infra/db';

const ownerId = (characterId: number): string => String(characterId);

const ensureCharacterInventory = async (characterId: number): Promise<string> => {
  const existing = await db()
    .selectFrom('inventories')
    .select('id')
    .where('owner_type', '=', 'character')
    .where('owner_id', '=', ownerId(characterId))
    .executeTakeFirst();
  if (existing) return existing.id;

  const created = await db()
    .insertInto('inventories')
    .values({ owner_type: 'character', owner_id: ownerId(characterId) })
    .onConflict((oc) => oc.columns(['owner_type', 'owner_id']).doNothing())
    .returning('id')
    .executeTakeFirst();
  if (created) return created.id;

  const raced = await db()
    .selectFrom('inventories')
    .select('id')
    .where('owner_type', '=', 'character')
    .where('owner_id', '=', ownerId(characterId))
    .executeTakeFirstOrThrow();
  return raced.id;
};

export const getCharacterInventory = async (characterId: number): Promise<InventoryView> => {
  const inventoryId = await ensureCharacterInventory(characterId);
  const inventory = await db()
    .selectFrom('inventories')
    .select(['id', 'capacity_weight', 'slots'])
    .where('id', '=', inventoryId)
    .executeTakeFirstOrThrow();

  const items = await db()
    .selectFrom('inventory_items as ii')
    .innerJoin('item_definitions as d', 'd.key', 'ii.item_key')
    .select([
      'ii.id',
      'ii.item_key',
      'ii.slot',
      'ii.quantity',
      'ii.metadata',
      'd.name',
      'd.category',
      'd.weight',
      'd.stack_size',
    ])
    .where('ii.inventory_id', '=', inventoryId)
    .orderBy('ii.slot')
    .execute();

  const used = await db()
    .selectFrom('inventory_items as ii')
    .innerJoin('item_definitions as d', 'd.key', 'ii.item_key')
    .select(sql<string>`COALESCE(SUM(ii.quantity * d.weight), 0)::numeric(10,3)`.as('weight'))
    .where('ii.inventory_id', '=', inventoryId)
    .executeTakeFirstOrThrow();

  return {
    inventoryId: inventory.id,
    capacityWeight: inventory.capacity_weight,
    usedWeight: used.weight,
    slots: inventory.slots,
    items: items.map((item) => ({
      id: item.id,
      itemKey: item.item_key,
      name: item.name,
      category: item.category,
      slot: item.slot,
      quantity: item.quantity,
      weightEach: item.weight,
      stackSize: item.stack_size,
      metadata: item.metadata,
    })),
  };
};

const assertSlot = (slot: number, slots: number): void => {
  if (!Number.isInteger(slot) || slot < 0 || slot >= slots) throw new Error('INVENTORY_INVALID_SLOT');
};

export const moveCharacterItem = async (characterId: number, itemId: string, toSlot: number): Promise<void> => {
  const inventoryId = await ensureCharacterInventory(characterId);

  await db().transaction().execute(async (trx) => {
    const inventory = await trx
      .selectFrom('inventories')
      .select('slots')
      .where('id', '=', inventoryId)
      .forUpdate()
      .executeTakeFirstOrThrow();
    assertSlot(toSlot, inventory.slots);

    const item = await trx
      .selectFrom('inventory_items')
      .select(['id', 'slot'])
      .where('id', '=', itemId)
      .where('inventory_id', '=', inventoryId)
      .forUpdate()
      .executeTakeFirst();
    if (!item) throw new Error('INVENTORY_ITEM_NOT_FOUND');
    if (item.slot === toSlot) return;

    const occupied = await trx
      .selectFrom('inventory_items')
      .select('id')
      .where('inventory_id', '=', inventoryId)
      .where('slot', '=', toSlot)
      .executeTakeFirst();
    if (occupied) throw new Error('INVENTORY_SLOT_OCCUPIED');

    await trx
      .updateTable('inventory_items')
      .set({ slot: toSlot, updated_at: new Date() })
      .where('id', '=', item.id)
      .execute();
  });
};

export const splitCharacterItem = async (
  characterId: number,
  itemId: string,
  quantity: number,
  toSlot: number,
): Promise<void> => {
  if (!Number.isInteger(quantity) || quantity <= 0) throw new Error('INVENTORY_INVALID_QUANTITY');
  const inventoryId = await ensureCharacterInventory(characterId);

  await db().transaction().execute(async (trx) => {
    const inventory = await trx
      .selectFrom('inventories')
      .select('slots')
      .where('id', '=', inventoryId)
      .forUpdate()
      .executeTakeFirstOrThrow();
    assertSlot(toSlot, inventory.slots);

    const item = await trx
      .selectFrom('inventory_items')
      .select(['id', 'item_key', 'slot', 'quantity', 'metadata'])
      .where('id', '=', itemId)
      .where('inventory_id', '=', inventoryId)
      .forUpdate()
      .executeTakeFirst();
    if (!item) throw new Error('INVENTORY_ITEM_NOT_FOUND');
    if (item.slot === toSlot) throw new Error('INVENTORY_INVALID_SLOT');
    if (quantity >= item.quantity) throw new Error('INVENTORY_INVALID_QUANTITY');

    const definition = await trx
      .selectFrom('item_definitions')
      .select('stack_size')
      .where('key', '=', item.item_key)
      .executeTakeFirstOrThrow();
    if (quantity > definition.stack_size) throw new Error('INVENTORY_INVALID_QUANTITY');

    const occupied = await trx
      .selectFrom('inventory_items')
      .select('id')
      .where('inventory_id', '=', inventoryId)
      .where('slot', '=', toSlot)
      .executeTakeFirst();
    if (occupied) throw new Error('INVENTORY_SLOT_OCCUPIED');

    await trx
      .updateTable('inventory_items')
      .set({ quantity: item.quantity - quantity, updated_at: new Date() })
      .where('id', '=', item.id)
      .execute();

    await trx
      .insertInto('inventory_items')
      .values({
        inventory_id: inventoryId,
        item_key: item.item_key,
        slot: toSlot,
        quantity,
        metadata: item.metadata,
      })
      .execute();
  });
};
