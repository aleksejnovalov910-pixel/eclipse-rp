import { sql } from 'kysely';
import type { FamilyInvitationView, FamilyMemberView, FamilyView } from '@eclipse/shared';
import { db } from '../../infra/db';

const NAME_RE = /^[A-Za-zА-Яа-яЁё0-9][A-Za-zА-Яа-яЁё0-9 _-]{2,38}[A-Za-zА-Яа-яЁё0-9]$/u;
const MONEY_RE = /^(?:0|[1-9]\d{0,11})(?:\.\d{1,2})?$/;
const INVITE_TTL_MS = 5 * 60_000;

interface Invitation {
  familyId: string;
  familyName: string;
  inviterCharacterId: number;
  expiresAt: number;
}

interface Membership {
  familyId: string;
  familyName: string;
  ownerCharacterId: number;
  rankIndex: number;
  permissions: Record<string, unknown>;
}

const invitations = new Map<number, Invitation>();
const normalizeName = (name: string): string => name.trim().replace(/\s+/g, ' ');
const normalizeMoney = (value: string): string => {
  const trimmed = value.trim();
  if (!MONEY_RE.test(trimmed) || /^0(?:\.0{1,2})?$/.test(trimmed)) throw new Error('INVALID_AMOUNT');
  const [whole, fraction = ''] = trimmed.split('.');
  return `${whole}.${fraction.padEnd(2, '0')}`;
};

const membership = async (characterId: number): Promise<Membership | null> => {
  const row = await db()
    .selectFrom('family_members as fm')
    .innerJoin('families as f', 'f.id', 'fm.family_id')
    .innerJoin('family_ranks as fr', 'fr.id', 'fm.rank_id')
    .select(['f.id', 'f.name', 'f.owner_character_id', 'fr.rank_index', 'fr.permissions'])
    .where('fm.character_id', '=', characterId)
    .executeTakeFirst();
  if (!row) return null;
  const permissions = typeof row.permissions === 'object' && row.permissions !== null
    ? row.permissions as Record<string, unknown>
    : {};
  return {
    familyId: row.id,
    familyName: row.name,
    ownerCharacterId: row.owner_character_id,
    rankIndex: row.rank_index,
    permissions,
  };
};

const can = (member: Membership, permission: string): boolean =>
  member.ownerCharacterId === member.ownerCharacterId &&
  (member.permissions['all'] === true || member.permissions[permission] === true || member.rankIndex >= 3);

export const getFamily = async (characterId: number): Promise<FamilyView | null> => {
  const row = await db()
    .selectFrom('family_members as fm')
    .innerJoin('families as f', 'f.id', 'fm.family_id')
    .innerJoin('family_ranks as fr', 'fr.id', 'fm.rank_id')
    .select(['f.id', 'f.name', 'f.balance', 'f.reputation', 'f.level', 'fr.name as rank_name'])
    .where('fm.character_id', '=', characterId)
    .executeTakeFirst();
  if (!row) return null;

  const count = await db()
    .selectFrom('family_members')
    .select((eb) => eb.fn.countAll<string>().as('count'))
    .where('family_id', '=', row.id)
    .executeTakeFirstOrThrow();

  return {
    id: row.id,
    name: row.name,
    balance: row.balance,
    reputation: row.reputation,
    level: row.level,
    rankName: row.rank_name,
    memberCount: Number(count.count),
  };
};

export const listMembers = async (characterId: number): Promise<FamilyMemberView[]> => {
  const member = await membership(characterId);
  if (!member) throw new Error('NOT_IN_FAMILY');
  const rows = await db()
    .selectFrom('family_members as fm')
    .innerJoin('characters as c', 'c.id', 'fm.character_id')
    .innerJoin('family_ranks as fr', 'fr.id', 'fm.rank_id')
    .select(['c.id', 'c.first_name', 'c.last_name', 'fr.name as rank_name', 'fr.rank_index', 'fm.contribution', 'fm.joined_at'])
    .where('fm.family_id', '=', member.familyId)
    .where('c.deleted_at', 'is', null)
    .orderBy('fr.rank_index', 'desc')
    .orderBy('fm.joined_at', 'asc')
    .execute();
  return rows.map((row) => ({
    characterId: row.id,
    name: `${row.first_name} ${row.last_name}`,
    rankName: row.rank_name,
    rankIndex: row.rank_index,
    contribution: row.contribution,
    joinedAt: row.joined_at.toISOString(),
  }));
};

export const createFamily = async (characterId: number, rawName: string): Promise<FamilyView> => {
  const name = normalizeName(rawName);
  if (!NAME_RE.test(name)) throw new Error('INVALID_FAMILY_NAME');
  const nameLower = name.toLocaleLowerCase('ru-RU');

  await db().transaction().execute(async (trx) => {
    const existingMembership = await trx.selectFrom('family_members').select('family_id')
      .where('character_id', '=', characterId).forUpdate().executeTakeFirst();
    if (existingMembership) throw new Error('ALREADY_IN_FAMILY');

    const created = await trx.insertInto('families')
      .values({ name, name_lower: nameLower, owner_character_id: characterId })
      .returning('id').executeTakeFirst();
    if (!created) throw new Error('FAMILY_CREATE_FAILED');

    const ranks = await trx.insertInto('family_ranks').values([
      { family_id: created.id, rank_index: 0, name: 'Новичок', permissions: {} },
      { family_id: created.id, rank_index: 1, name: 'Участник', permissions: { storage: true } },
      { family_id: created.id, rank_index: 2, name: 'Заместитель', permissions: { storage: true, invite: true, contracts: true } },
      { family_id: created.id, rank_index: 3, name: 'Глава', permissions: { all: true } },
    ]).returning(['id', 'rank_index']).execute();

    const ownerRank = ranks.find((rank) => rank.rank_index === 3);
    if (!ownerRank) throw new Error('FAMILY_CREATE_FAILED');
    await trx.insertInto('family_members')
      .values({ family_id: created.id, character_id: characterId, rank_id: ownerRank.id }).execute();
  }).catch((error: unknown) => {
    const pgCode = typeof error === 'object' && error !== null && 'code' in error ? String((error as { code?: unknown }).code) : '';
    if (pgCode === '23505') throw new Error('FAMILY_NAME_TAKEN');
    throw error;
  });

  const family = await getFamily(characterId);
  if (!family) throw new Error('FAMILY_CREATE_FAILED');
  return family;
};

export const inviteMember = async (inviterCharacterId: number, targetCharacterId: number): Promise<FamilyInvitationView> => {
  if (!Number.isInteger(targetCharacterId) || targetCharacterId <= 0 || targetCharacterId === inviterCharacterId) {
    throw new Error('INVALID_TARGET');
  }
  const inviter = await membership(inviterCharacterId);
  if (!inviter) throw new Error('NOT_IN_FAMILY');
  if (!can(inviter, 'invite')) throw new Error('NO_PERMISSION');

  const target = await db().selectFrom('characters').select('id')
    .where('id', '=', targetCharacterId).where('deleted_at', 'is', null).executeTakeFirst();
  if (!target) throw new Error('CHARACTER_NOT_FOUND');
  if (await membership(targetCharacterId)) throw new Error('TARGET_IN_FAMILY');

  const invite: Invitation = {
    familyId: inviter.familyId,
    familyName: inviter.familyName,
    inviterCharacterId,
    expiresAt: Date.now() + INVITE_TTL_MS,
  };
  invitations.set(targetCharacterId, invite);
  return { ...invite, expiresAt: new Date(invite.expiresAt).toISOString() };
};

export const getInvitation = (characterId: number): FamilyInvitationView | null => {
  const invite = invitations.get(characterId);
  if (!invite) return null;
  if (invite.expiresAt <= Date.now()) {
    invitations.delete(characterId);
    return null;
  }
  return { ...invite, expiresAt: new Date(invite.expiresAt).toISOString() };
};

export const acceptInvitation = async (characterId: number): Promise<FamilyView> => {
  const invite = invitations.get(characterId);
  if (!invite || invite.expiresAt <= Date.now()) {
    invitations.delete(characterId);
    throw new Error('INVITE_NOT_FOUND');
  }

  await db().transaction().execute(async (trx) => {
    const existing = await trx.selectFrom('family_members').select('family_id')
      .where('character_id', '=', characterId).forUpdate().executeTakeFirst();
    if (existing) throw new Error('ALREADY_IN_FAMILY');
    const rank = await trx.selectFrom('family_ranks').select('id')
      .where('family_id', '=', invite.familyId).where('rank_index', '=', 0).executeTakeFirst();
    if (!rank) throw new Error('FAMILY_NOT_FOUND');
    await trx.insertInto('family_members').values({ family_id: invite.familyId, character_id: characterId, rank_id: rank.id }).execute();
  });
  invitations.delete(characterId);
  const family = await getFamily(characterId);
  if (!family) throw new Error('FAMILY_NOT_FOUND');
  return family;
};

export const leaveFamily = async (characterId: number): Promise<void> => {
  const member = await membership(characterId);
  if (!member) throw new Error('NOT_IN_FAMILY');
  if (member.ownerCharacterId === characterId) throw new Error('OWNER_CANNOT_LEAVE');
  await db().deleteFrom('family_members').where('character_id', '=', characterId).execute();
};

export const treasuryDeposit = async (characterId: number, amountInput: string): Promise<FamilyView> => {
  const amount = normalizeMoney(amountInput);
  const member = await membership(characterId);
  if (!member) throw new Error('NOT_IN_FAMILY');
  await db().transaction().execute(async (trx) => {
    const character = await trx.selectFrom('characters').select(['id', 'bank'])
      .where('id', '=', characterId).where(sql<boolean>`bank >= ${amount}::numeric`).forUpdate().executeTakeFirst();
    if (!character) throw new Error('INSUFFICIENT_FUNDS');
    await trx.selectFrom('families').select('id').where('id', '=', member.familyId).forUpdate().executeTakeFirstOrThrow();
    const updated = await trx.updateTable('characters')
      .set({ bank: sql<string>`bank - ${amount}::numeric`, updated_at: new Date() })
      .where('id', '=', characterId).returning('bank').executeTakeFirstOrThrow();
    await trx.updateTable('families')
      .set({ balance: sql<string>`balance + ${amount}::numeric`, updated_at: new Date() })
      .where('id', '=', member.familyId).execute();
    await trx.insertInto('bank_transactions').values({
      character_id: characterId, counterparty_id: null, kind: 'family_deposit', amount,
      balance_after: updated.bank, description: `Взнос в семью ${member.familyName}`,
    }).execute();
    await trx.insertInto('economy_ledger').values({
      character_id: characterId, family_id: member.familyId, source: 'family_treasury', direction: 'move', amount,
      metadata: { action: 'deposit' },
    }).execute();
  });
  const family = await getFamily(characterId);
  if (!family) throw new Error('FAMILY_NOT_FOUND');
  return family;
};

export const treasuryWithdraw = async (characterId: number, amountInput: string): Promise<FamilyView> => {
  const amount = normalizeMoney(amountInput);
  const member = await membership(characterId);
  if (!member) throw new Error('NOT_IN_FAMILY');
  if (!can(member, 'treasury')) throw new Error('NO_PERMISSION');
  await db().transaction().execute(async (trx) => {
    const family = await trx.selectFrom('families').select('id')
      .where('id', '=', member.familyId).where(sql<boolean>`balance >= ${amount}::numeric`).forUpdate().executeTakeFirst();
    if (!family) throw new Error('INSUFFICIENT_FAMILY_FUNDS');
    await trx.updateTable('families')
      .set({ balance: sql<string>`balance - ${amount}::numeric`, updated_at: new Date() })
      .where('id', '=', member.familyId).execute();
    const updated = await trx.updateTable('characters')
      .set({ bank: sql<string>`bank + ${amount}::numeric`, updated_at: new Date() })
      .where('id', '=', characterId).returning('bank').executeTakeFirstOrThrow();
    await trx.insertInto('bank_transactions').values({
      character_id: characterId, counterparty_id: null, kind: 'family_withdraw', amount,
      balance_after: updated.bank, description: `Вывод из казны ${member.familyName}`,
    }).execute();
    await trx.insertInto('economy_ledger').values({
      character_id: characterId, family_id: member.familyId, source: 'family_treasury', direction: 'move', amount,
      metadata: { action: 'withdraw' },
    }).execute();
  });
  const family = await getFamily(characterId);
  if (!family) throw new Error('FAMILY_NOT_FOUND');
  return family;
};
