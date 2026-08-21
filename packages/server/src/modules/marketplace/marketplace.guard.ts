import { sql } from 'kysely';
import { db } from '../../infra/db';
import type { MarketplaceObjectType } from '@eclipse/shared';

export const isActivelyListed = async (objectType: MarketplaceObjectType, objectId: string): Promise<boolean> => {
  const result = await sql`
    SELECT id
    FROM marketplace_listings
    WHERE object_type=${objectType}
      AND object_id=${objectId}::uuid
      AND status='active'
      AND expires_at>NOW()
    LIMIT 1
  `.execute(db());
  return result.rows.length > 0;
};

export const assertNotActivelyListed = async (objectType: MarketplaceObjectType, objectId: string): Promise<void> => {
  if (await isActivelyListed(objectType, objectId)) throw new Error('OBJECT_LISTED');
};
