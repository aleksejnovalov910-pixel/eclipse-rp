import { sql } from 'kysely';
import type { PropertyOwnedView, PropertyPurchaseResult, PropertySaleResult, PropertyView } from '@eclipse/shared';
import { db } from '../../infra/db';

interface PropertyRow {
  id: string;
  kind: 'house' | 'apartment';
  name: string;
  price: string;
  owner_character_id: number | null;
  exterior_x: string;
  exterior_y: string;
  exterior_z: string;
  exterior_heading: string;
  exterior_dimension: number;
  interior_x: string;
  interior_y: string;
  interior_z: string;
  interior_heading: string;
  instance_dimension: number;
}

const selectSql = sql<PropertyRow>`
  SELECT id, kind, name, price, owner_character_id,
         exterior_x, exterior_y, exterior_z, exterior_heading, exterior_dimension,
         interior_x, interior_y, interior_z, interior_heading, instance_dimension
  FROM properties
`;

const point = (x: string, y: string, z: string, heading: string, dimension: number) => ({
  x: Number(x), y: Number(y), z: Number(z), heading: Number(heading), dimension,
});

const toView = (row: PropertyRow, characterId: number): PropertyView => ({
  id: row.id,
  kind: row.kind,
  name: row.name,
  price: row.price,
  owned: row.owner_character_id !== null,
  ownedByMe: row.owner_character_id === characterId,
  exterior: point(row.exterior_x, row.exterior_y, row.exterior_z, row.exterior_heading, row.exterior_dimension),
});

const toOwnedView = (row: PropertyRow, characterId: number): PropertyOwnedView => ({
  ...toView(row, characterId),
  interior: point(row.interior_x, row.interior_y, row.interior_z, row.interior_heading, row.instance_dimension),
});

const findRow = async (propertyId: string): Promise<PropertyRow | null> => {
  const result = await sql<PropertyRow>`
    SELECT id, kind, name, price, owner_character_id,
           exterior_x, exterior_y, exterior_z, exterior_heading, exterior_dimension,
           interior_x, interior_y, interior_z, interior_heading, instance_dimension
    FROM properties WHERE id = ${propertyId}::uuid
  `.execute(db());
  return result.rows[0] ?? null;
};

export const listProperties = async (characterId: number): Promise<PropertyView[]> => {
  const result = await sql<PropertyRow>`
    SELECT id, kind, name, price, owner_character_id,
           exterior_x, exterior_y, exterior_z, exterior_heading, exterior_dimension,
           interior_x, interior_y, interior_z, interior_heading, instance_dimension
    FROM properties ORDER BY price ASC, name ASC
  `.execute(db());
  return result.rows.map((row) => toView(row, characterId));
};

export const listOwnedProperties = async (characterId: number): Promise<PropertyOwnedView[]> => {
  const result = await sql<PropertyRow>`
    SELECT id, kind, name, price, owner_character_id,
           exterior_x, exterior_y, exterior_z, exterior_heading, exterior_dimension,
           interior_x, interior_y, interior_z, interior_heading, instance_dimension
    FROM properties WHERE owner_character_id = ${characterId} ORDER BY name ASC
  `.execute(db());
  return result.rows.map((row) => toOwnedView(row, characterId));
};

export const getOwnedProperty = async (characterId: number, propertyId: string): Promise<PropertyOwnedView> => {
  const row = await findRow(propertyId);
  if (!row || row.owner_character_id !== characterId) throw new Error('PROPERTY_NOT_OWNED');
  return toOwnedView(row, characterId);
};

export const buyProperty = async (characterId: number, propertyId: string): Promise<PropertyPurchaseResult> =>
  db().transaction().execute(async (trx) => {
    const propertyResult = await sql<PropertyRow>`
      SELECT id, kind, name, price, owner_character_id,
             exterior_x, exterior_y, exterior_z, exterior_heading, exterior_dimension,
             interior_x, interior_y, interior_z, interior_heading, instance_dimension
      FROM properties WHERE id = ${propertyId}::uuid FOR UPDATE
    `.execute(trx);
    const property = propertyResult.rows[0];
    if (!property) throw new Error('PROPERTY_NOT_FOUND');
    if (property.owner_character_id !== null) throw new Error('PROPERTY_OWNED');

    const character = await trx.selectFrom('characters').select('id')
      .where('id', '=', characterId).where('deleted_at', 'is', null)
      .where(sql<boolean>`bank >= ${property.price}::numeric`).forUpdate().executeTakeFirst();
    if (!character) throw new Error('INSUFFICIENT_FUNDS');

    const updated = await trx.updateTable('characters')
      .set({ bank: sql<string>`bank - ${property.price}::numeric`, updated_at: new Date() })
      .where('id', '=', characterId).returning('bank').executeTakeFirstOrThrow();

    await sql`UPDATE properties SET owner_character_id = ${characterId}, updated_at = NOW() WHERE id = ${propertyId}::uuid`.execute(trx);
    await trx.insertInto('bank_transactions').values({
      character_id: characterId, counterparty_id: null, kind: 'property_purchase', amount: property.price,
      balance_after: updated.bank, description: `Покупка недвижимости: ${property.name}`,
    }).execute();
    await trx.insertInto('economy_ledger').values({
      character_id: characterId, family_id: null, source: 'property_purchase', direction: 'sink', amount: property.price,
      metadata: { propertyId },
    }).execute();

    return { property: toOwnedView({ ...property, owner_character_id: characterId }, characterId), bank: updated.bank };
  });

export const sellPropertyToState = async (characterId: number, propertyId: string): Promise<PropertySaleResult> =>
  db().transaction().execute(async (trx) => {
    const propertyResult = await sql<PropertyRow>`
      SELECT id, kind, name, price, owner_character_id,
             exterior_x, exterior_y, exterior_z, exterior_heading, exterior_dimension,
             interior_x, interior_y, interior_z, interior_heading, instance_dimension
      FROM properties WHERE id = ${propertyId}::uuid FOR UPDATE
    `.execute(trx);
    const property = propertyResult.rows[0];
    if (!property || property.owner_character_id !== characterId) throw new Error('PROPERTY_NOT_OWNED');

    const refundResult = await sql<{ refund: string }>`SELECT ROUND(${property.price}::numeric * 0.70, 2)::text AS refund`.execute(trx);
    const refund = refundResult.rows[0]?.refund;
    if (!refund) throw new Error('PROPERTY_SALE_FAILED');

    await sql`UPDATE properties SET owner_character_id = NULL, updated_at = NOW() WHERE id = ${propertyId}::uuid`.execute(trx);
    const updated = await trx.updateTable('characters')
      .set({ bank: sql<string>`bank + ${refund}::numeric`, updated_at: new Date() })
      .where('id', '=', characterId).returning('bank').executeTakeFirstOrThrow();
    await trx.insertInto('bank_transactions').values({
      character_id: characterId, counterparty_id: null, kind: 'property_sale_state', amount: refund,
      balance_after: updated.bank, description: `Продажа государству: ${property.name}`,
    }).execute();
    await trx.insertInto('economy_ledger').values({
      character_id: characterId, family_id: null, source: 'property_sale_state', direction: 'source', amount: refund,
      metadata: { propertyId },
    }).execute();
    return { propertyId, refund, bank: updated.bank };
  });
