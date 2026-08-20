import type { Generated, ColumnType } from 'kysely';

/**
 * Типизированная схема базы данных для Kysely.
 * Источник правды — SQL-миграции в database/migrations.
 */
type Timestamp = ColumnType<Date, Date | string | undefined, Date | string>;
type TimestampNullable = ColumnType<Date | null, Date | string | null | undefined, Date | string | null>;
type JsonValue = unknown;

export interface AccountsTable {
  id: Generated<number>;
  login: string;
  login_lower: string;
  email: string;
  password_hash: string;
  admin_level: Generated<number>;
  social_club: string | null;
  last_ip: string | null;
  last_login_at: TimestampNullable;
  banned_until: TimestampNullable;
  ban_reason: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface CharactersTable {
  id: Generated<number>;
  account_id: number;
  slot: number;
  first_name: string;
  last_name: string;
  name_lower: string;
  gender: string;
  level: Generated<number>;
  experience: Generated<number>;
  played_minutes: Generated<number>;
  cash: Generated<string>;
  bank: Generated<string>;
  health: Generated<number>;
  armour: Generated<number>;
  position_x: Generated<string>;
  position_y: Generated<string>;
  position_z: Generated<string>;
  heading: Generated<string>;
  dimension: Generated<number>;
  appearance: Generated<JsonValue>;
  deleted_at: TimestampNullable;
  last_played_at: TimestampNullable;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface AuthLogTable {
  id: Generated<number>;
  account_id: number | null;
  login_attempted: string;
  ip: string | null;
  social_club: string | null;
  success: boolean;
  failure_reason: string | null;
  created_at: Timestamp;
}

export interface BankTransactionsTable {
  id: Generated<string>;
  character_id: number;
  counterparty_id: number | null;
  kind: string;
  amount: string;
  balance_after: string;
  description: string | null;
  metadata: Generated<JsonValue>;
  created_at: Timestamp;
}

export interface ItemDefinitionsTable {
  key: string;
  name: string;
  category: string;
  weight: Generated<string>;
  stack_size: Generated<number>;
  tradable: Generated<boolean>;
  droppable: Generated<boolean>;
  metadata: Generated<JsonValue>;
}

export interface InventoriesTable {
  id: Generated<string>;
  owner_type: string;
  owner_id: string;
  capacity_weight: Generated<string>;
  slots: Generated<number>;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface InventoryItemsTable {
  id: Generated<string>;
  inventory_id: string;
  item_key: string;
  slot: number;
  quantity: Generated<number>;
  metadata: Generated<JsonValue>;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface VehiclesTable {
  id: Generated<string>;
  owner_character_id: number | null;
  owner_family_id: string | null;
  model: string;
  vin: string;
  plate: string | null;
  primary_color: Generated<number>;
  secondary_color: Generated<number>;
  fuel: Generated<string>;
  mileage: Generated<string>;
  engine_health: Generated<string>;
  body_health: Generated<string>;
  insurance_until: TimestampNullable;
  locked: Generated<boolean>;
  impounded: Generated<boolean>;
  position_x: string | null;
  position_y: string | null;
  position_z: string | null;
  heading: string | null;
  dimension: Generated<number>;
  tuning: Generated<JsonValue>;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface FamiliesTable {
  id: Generated<string>;
  name: string;
  name_lower: string;
  owner_character_id: number;
  balance: Generated<string>;
  reputation: Generated<number>;
  level: Generated<number>;
  color: Generated<number>;
  settings: Generated<JsonValue>;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface FamilyRanksTable {
  id: Generated<string>;
  family_id: string;
  rank_index: number;
  name: string;
  permissions: Generated<JsonValue>;
}

export interface FamilyMembersTable {
  family_id: string;
  character_id: number;
  rank_id: string;
  contribution: Generated<number>;
  joined_at: Timestamp;
}

export interface FamilyContractsTable {
  id: Generated<string>;
  family_id: string;
  contract_key: string;
  progress: Generated<number>;
  target: number;
  reward_money: Generated<string>;
  reward_reputation: Generated<number>;
  expires_at: Timestamp;
  completed_at: TimestampNullable;
  created_at: Timestamp;
}

export interface JobProgressTable {
  character_id: number;
  job_key: string;
  level: Generated<number>;
  experience: Generated<number>;
  completed: Generated<number>;
  updated_at: Timestamp;
}

export interface EconomyLedgerTable {
  id: Generated<string>;
  character_id: number | null;
  family_id: string | null;
  source: string;
  direction: string;
  amount: string;
  metadata: Generated<JsonValue>;
  created_at: Timestamp;
}

export interface MigrationsTable {
  name: string;
  applied_at: Timestamp;
}

export interface Database {
  accounts: AccountsTable;
  characters: CharactersTable;
  auth_log: AuthLogTable;
  bank_transactions: BankTransactionsTable;
  item_definitions: ItemDefinitionsTable;
  inventories: InventoriesTable;
  inventory_items: InventoryItemsTable;
  vehicles: VehiclesTable;
  families: FamiliesTable;
  family_ranks: FamilyRanksTable;
  family_members: FamilyMembersTable;
  family_contracts: FamilyContractsTable;
  job_progress: JobProgressTable;
  economy_ledger: EconomyLedgerTable;
  _migrations: MigrationsTable;
}
