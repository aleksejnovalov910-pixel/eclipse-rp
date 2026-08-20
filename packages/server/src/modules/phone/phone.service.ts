import type {
  PhoneContactSaveRequest,
  PhoneContactView,
  PhoneMessageView,
  PhoneProfileView,
  PhoneSendMessageRequest,
} from '@eclipse/shared';
import { db } from '../../infra/db';

const PHONE_RE = /^\d{7,10}$/;

export const getProfile = async (characterId: number): Promise<PhoneProfileView> => {
  const row = await db().selectFrom('characters').select(['id', 'phone_number'])
    .where('id', '=', characterId).where('deleted_at', 'is', null).executeTakeFirst();
  if (!row) throw new Error('CHARACTER_NOT_FOUND');
  if (row.phone_number) return { phoneNumber: row.phone_number };

  const phoneNumber = String(1_000_000 + characterId);
  const updated = await db().updateTable('characters').set({ phone_number: phoneNumber, updated_at: new Date() })
    .where('id', '=', characterId).where('phone_number', 'is', null).returning('phone_number').executeTakeFirst();
  if (updated?.phone_number) return { phoneNumber: updated.phone_number };

  const raced = await db().selectFrom('characters').select('phone_number').where('id', '=', characterId).executeTakeFirstOrThrow();
  if (!raced.phone_number) throw new Error('PHONE_ASSIGN_FAILED');
  return { phoneNumber: raced.phone_number };
};

export const listContacts = async (characterId: number): Promise<PhoneContactView[]> => {
  const rows = await db().selectFrom('phone_contacts').select(['id', 'phone_number', 'display_name'])
    .where('owner_character_id', '=', characterId).orderBy('display_name').execute();
  return rows.map((r) => ({ id: r.id, phoneNumber: r.phone_number, displayName: r.display_name }));
};

export const saveContact = async (characterId: number, request: PhoneContactSaveRequest): Promise<PhoneContactView> => {
  const phoneNumber = request.phoneNumber.trim();
  const displayName = request.displayName.trim().replace(/\s+/g, ' ');
  if (!PHONE_RE.test(phoneNumber)) throw new Error('INVALID_PHONE_NUMBER');
  if (displayName.length < 1 || displayName.length > 40) throw new Error('INVALID_CONTACT_NAME');

  const target = await db().selectFrom('characters').select('id').where('phone_number', '=', phoneNumber)
    .where('deleted_at', 'is', null).executeTakeFirst();
  if (!target) throw new Error('PHONE_NOT_FOUND');

  const row = await db().insertInto('phone_contacts')
    .values({ owner_character_id: characterId, phone_number: phoneNumber, display_name: displayName })
    .onConflict((oc) => oc.columns(['owner_character_id', 'phone_number']).doUpdateSet({ display_name: displayName, updated_at: new Date() }))
    .returning(['id', 'phone_number', 'display_name']).executeTakeFirstOrThrow();
  return { id: row.id, phoneNumber: row.phone_number, displayName: row.display_name };
};

export const listMessages = async (characterId: number, limitInput = 100): Promise<PhoneMessageView[]> => {
  const profile = await getProfile(characterId);
  const limit = Number.isInteger(limitInput) ? Math.min(Math.max(limitInput, 1), 200) : 100;
  const rows = await db().selectFrom('phone_messages as m')
    .innerJoin('characters as sender', 'sender.id', 'm.sender_character_id')
    .innerJoin('characters as recipient', 'recipient.id', 'm.recipient_character_id')
    .select(['m.id', 'm.sender_character_id', 'm.recipient_character_id', 'm.body', 'm.read_at', 'm.created_at',
      'sender.phone_number as sender_phone', 'recipient.phone_number as recipient_phone'])
    .where((eb) => eb.or([eb('m.sender_character_id', '=', characterId), eb('m.recipient_character_id', '=', characterId)]))
    .orderBy('m.created_at', 'desc').limit(limit).execute();

  return rows.map((r) => ({
    id: r.id,
    direction: r.sender_character_id === characterId ? 'out' : 'in',
    otherPhoneNumber: r.sender_character_id === characterId ? (r.recipient_phone ?? '') : (r.sender_phone ?? ''),
    body: r.body,
    read: r.sender_character_id === characterId || r.read_at !== null,
    createdAt: r.created_at.toISOString(),
  })).filter((m) => m.otherPhoneNumber !== profile.phoneNumber);
};

export const sendMessage = async (characterId: number, request: PhoneSendMessageRequest): Promise<PhoneMessageView> => {
  const phoneNumber = request.phoneNumber.trim();
  const body = request.body.trim();
  if (!PHONE_RE.test(phoneNumber)) throw new Error('INVALID_PHONE_NUMBER');
  if (body.length < 1 || body.length > 500) throw new Error('INVALID_MESSAGE');

  await getProfile(characterId);
  const target = await db().selectFrom('characters').select(['id', 'phone_number']).where('phone_number', '=', phoneNumber)
    .where('deleted_at', 'is', null).executeTakeFirst();
  if (!target) throw new Error('PHONE_NOT_FOUND');
  if (target.id === characterId) throw new Error('PHONE_SELF_MESSAGE');

  const row = await db().insertInto('phone_messages')
    .values({ sender_character_id: characterId, recipient_character_id: target.id, body })
    .returning(['id', 'body', 'created_at']).executeTakeFirstOrThrow();
  return { id: row.id, direction: 'out', otherPhoneNumber: phoneNumber, body: row.body, read: true, createdAt: row.created_at.toISOString() };
};
