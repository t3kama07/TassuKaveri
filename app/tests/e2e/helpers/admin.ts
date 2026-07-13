import pg from 'pg';
import { createClient } from '@supabase/supabase-js';
import { LEGAL_DOCUMENT_VERSIONS } from '../../../lib/legalPolicy';
import type { Transaction, Wallet } from '../../../types/wallet';

const { Client } = pg;
const STARTER_BALANCE = 3;

export interface PlaywrightAuthUser {
  id: string;
  email: string;
  createdAt: string;
}

export interface SeededTestUser {
  email: string;
  password: string;
  name: string;
  uid: string;
}

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name} for Playwright setup`);
  }

  return value;
}

function getDatabaseUrl(): string {
  const normalizedUrl = new URL(getRequiredEnv('SUPABASE_DB_URL'));
  normalizedUrl.searchParams.delete('sslmode');
  return normalizedUrl.toString();
}

export function createTestSupabaseAdminClient() {
  return createClient(
    getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
    getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

export async function withDatabase<T>(callback: (database: pg.Client) => Promise<T>): Promise<T> {
  const database = new Client({
    connectionString: getDatabaseUrl(),
    ssl: { rejectUnauthorized: false },
  });

  await database.connect();
  try {
    return await callback(database);
  } finally {
    await database.end();
  }
}

function isPlaywrightTestEmail(email: string): boolean {
  return (
    /^pw[a-z0-9]+user\d+@example\.com$/i.test(email) ||
    /^playwright-signup@example\.invalid$/i.test(email) ||
    /^playwright-signup-\d+@gmail\.com$/i.test(email)
  );
}

export async function listPlaywrightAuthUsers(): Promise<PlaywrightAuthUser[]> {
  const supabase = createTestSupabaseAdminClient();
  const users: PlaywrightAuthUser[] = [];
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) {
      throw new Error(`Failed to list Supabase auth users: ${error.message}`);
    }

    for (const user of data.users) {
      const email = user.email?.trim() || '';
      if (email && isPlaywrightTestEmail(email)) {
        users.push({ id: user.id, email, createdAt: user.created_at });
      }
    }

    if (data.users.length < 200) {
      return users;
    }
    page += 1;
  }
}

export async function deletePlaywrightTestUsers(userIds: string[]): Promise<void> {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (ids.length === 0) {
    return;
  }

  await withDatabase(async (database) => {
    await database.query('begin');
    try {
      await database.query(
        `delete from public.messages
         where owner_uid = any($1::text[])
            or sitter_uid = any($1::text[])
            or sender_uid = any($1::text[])
            or recipient_uid = any($1::text[])`,
        [ids]
      );
      await database.query(
        `delete from public.conversations
         where owner_uid = any($1::text[])
            or sitter_uid = any($1::text[])
            or participants && $1::text[]`,
        [ids]
      );
      await database.query(
        `delete from public.requests
         where owner_uid = any($1::text[])
            or sitter_uid = any($1::text[])
            or requested_sitter_uid = any($1::text[])`,
        [ids]
      );
      await database.query(
        `delete from public.reports
         where reporter_uid = any($1::text[])
            or target_user_uid = any($1::text[])
            or target_owner_uid = any($1::text[])`,
        [ids]
      );

      for (const statement of [
        'delete from public.notifications where user_uid = any($1::text[])',
        'delete from public.favorites where owner_uid = any($1::text[]) or sitter_uid = any($1::text[])',
        'delete from public.legal_acceptances where user_uid = any($1::text[])',
        'delete from public.wallet_transactions where user_uid = any($1::text[])',
        'delete from public.wallets where user_uid = any($1::text[])',
        'delete from public.availability_slots where user_uid = any($1::text[])',
        'delete from public.pets where owner_uid = any($1::text[])',
        'delete from public.public_profiles where uid = any($1::text[])',
        'delete from public.profiles where uid = any($1::text[])',
      ]) {
        await database.query(statement, [ids]);
      }
      await database.query('commit');
    } catch (error) {
      await database.query('rollback');
      throw error;
    }
  });

  const supabase = createTestSupabaseAdminClient();
  for (const id of ids) {
    const { error } = await supabase.auth.admin.deleteUser(id);
    if (error) {
      throw new Error(`Failed to delete Playwright auth user ${id}: ${error.message}`);
    }
  }
}

async function findAuthUserByEmail(email: string): Promise<string | null> {
  const supabase = createTestSupabaseAdminClient();
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) {
      throw new Error(`Failed to list Supabase auth users: ${error.message}`);
    }

    const match = data.users.find(
      (user) => user.email?.trim().toLowerCase() === email.trim().toLowerCase()
    );
    if (match?.id) {
      return match.id;
    }

    if (data.users.length < 200) {
      return null;
    }
    page += 1;
  }
}

async function createOrUpdateAuthUser(params: {
  email: string;
  password: string;
  name: string;
}): Promise<string> {
  const supabase = createTestSupabaseAdminClient();
  const existingUserId = await findAuthUserByEmail(params.email);

  if (existingUserId) {
    const { error } = await supabase.auth.admin.updateUserById(existingUserId, {
      email: params.email,
      password: params.password,
      email_confirm: true,
      user_metadata: {
        name: params.name,
        displayName: params.name,
      },
    });

    if (error) {
      throw new Error(`Failed to update Supabase auth user: ${error.message}`);
    }

    return existingUserId;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: params.email,
    password: params.password,
    email_confirm: true,
    user_metadata: {
      name: params.name,
      displayName: params.name,
    },
  });

  if (error || !data.user?.id) {
    throw new Error(`Failed to create Supabase auth user: ${error?.message ?? 'Missing user id'}`);
  }

  return data.user.id;
}

function todayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

async function seedAppRows(user: SeededTestUser, location: string, country: string): Promise<void> {
  const now = new Date().toISOString();
  const legalRows = Object.entries(LEGAL_DOCUMENT_VERSIONS).map(([document, version]) => ({
    document,
    version,
  }));

  await withDatabase(async (database) => {
    await database.query('begin');
    try {
      await database.query(
        `insert into public.profiles (
           uid, email, name, location, country, email_verified, role, frozen, created_at, updated_at
         )
         values ($1, $2, $3, $4, $5, true, 'user', false, $6, $6)
         on conflict (uid) do update set
           email = excluded.email,
           name = excluded.name,
           location = excluded.location,
           country = excluded.country,
           email_verified = true,
           role = 'user',
           frozen = false,
           updated_at = excluded.updated_at`,
        [user.uid, user.email, user.name, location, country, now]
      );
      await database.query(
        `insert into public.public_profiles (uid, name, location, country, created_at, updated_at)
         values ($1, $2, $3, $4, $5, $5)
         on conflict (uid) do update set
           name = excluded.name,
           location = excluded.location,
           country = excluded.country,
           updated_at = excluded.updated_at`,
        [user.uid, user.name, location, country, now]
      );
      await database.query(
        'delete from public.wallet_transactions where user_uid = $1 and id = $2',
        [user.uid, `starter-bonus-${user.uid}`]
      );
      await database.query(
        `insert into public.wallets (
           user_uid, balance, daily_earned_date, daily_earned_credits, last_wallet_action, created_at, updated_at
         )
         values ($1, $2, $3, 0, 'starter_bonus', $4, $4)
         on conflict (user_uid) do update set
           balance = excluded.balance,
           daily_earned_date = excluded.daily_earned_date,
           daily_earned_credits = excluded.daily_earned_credits,
           last_wallet_action = excluded.last_wallet_action,
           updated_at = excluded.updated_at`,
        [user.uid, STARTER_BALANCE, todayKey(), now]
      );
      await database.query(
        `insert into public.wallet_transactions (
           id, user_uid, tx_type, amount, reference, occurred_at, balance_after
         )
         values ($1, $2, 'starter_bonus', $3, 'Starter bonus', $4, $3)
         on conflict (id) do update set
           amount = excluded.amount,
           reference = excluded.reference,
           occurred_at = excluded.occurred_at,
           balance_after = excluded.balance_after`,
        [
          `starter-bonus-${user.uid}`,
          user.uid,
          STARTER_BALANCE,
          now,
        ]
      );
      await database.query('delete from public.legal_acceptances where user_uid = $1', [user.uid]);
      await database.query(
        `insert into public.legal_acceptances (user_uid, document, version, accepted_at)
         values ($1, $2, $3, $4), ($1, $5, $6, $4)`,
        [
          user.uid,
          legalRows[0].document,
          legalRows[0].version,
          now,
          legalRows[1].document,
          legalRows[1].version,
        ]
      );
      await database.query('commit');
    } catch (error) {
      await database.query('rollback');
      throw error;
    }
  });
}

export async function createSeededTestUsers(options: {
  aliases: string[];
  prefix: string;
  domain: string;
  password: string;
  location: string;
  country: string;
}): Promise<SeededTestUser[]> {
  const users: SeededTestUser[] = [];

  for (const [index] of options.aliases.entries()) {
    const email = `${options.prefix}${index + 1}@${options.domain}`;
    const name = `Test User ${index + 1}`;
    const uid = await createOrUpdateAuthUser({ email, password: options.password, name });
    const user = { email, password: options.password, name, uid };
    await seedAppRows(user, options.location, options.country);
    users.push(user);
  }

  return users;
}

export async function clearLegalAcceptances(uid: string): Promise<void> {
  await withDatabase(async (database) => {
    await database.query('delete from public.legal_acceptances where user_uid = $1', [uid]);
  });
}

export async function restoreLatestLegalAcceptances(uid: string): Promise<void> {
  const acceptedAt = new Date().toISOString();
  await withDatabase(async (database) => {
    for (const [document, version] of Object.entries(LEGAL_DOCUMENT_VERSIONS)) {
      await database.query(
        `insert into public.legal_acceptances (user_uid, document, version, accepted_at)
         values ($1, $2, $3, $4)
         on conflict (user_uid, document, version)
         do update set accepted_at = excluded.accepted_at`,
        [uid, document, version, acceptedAt]
      );
    }
  });
}

export async function hasLatestLegalAcceptances(uid: string): Promise<boolean> {
  return withDatabase(async (database) => {
    const result = await database.query<{ document: string; version: string }>(
      'select document, version from public.legal_acceptances where user_uid = $1',
      [uid]
    );

    return Object.entries(LEGAL_DOCUMENT_VERSIONS).every(([document, version]) =>
      result.rows.some((row) => row.document === document && row.version === version)
    );
  });
}

export async function setProfileRole(uid: string, role: 'admin' | 'user'): Promise<void> {
  const supabase = createTestSupabaseAdminClient();
  const { error } = await supabase
    .from('profiles')
    .update({ role, updated_at: new Date().toISOString() })
    .eq('uid', uid);

  if (error) {
    throw new Error(`Failed to set profile role: ${error.message}`);
  }
}

export async function setProfileFrozen(uid: string, frozen: boolean): Promise<void> {
  const supabase = createTestSupabaseAdminClient();
  const { error } = await supabase
    .from('profiles')
    .update({ frozen, updated_at: new Date().toISOString() })
    .eq('uid', uid);

  if (error) {
    throw new Error(`Failed to set profile frozen state: ${error.message}`);
  }
}

export async function getProfileFrozen(uid: string): Promise<boolean> {
  const supabase = createTestSupabaseAdminClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('frozen')
    .eq('uid', uid)
    .maybeSingle<{ frozen: boolean }>();

  if (error) {
    throw new Error(`Failed to read profile frozen state: ${error.message}`);
  }

  return Boolean(data?.frozen);
}

function mapWalletRow(row: {
  balance: number;
  last_request_id: string | null;
  last_request_owner_id: string | null;
  daily_earned_date: string | null;
  daily_earned_credits: number | null;
  last_wallet_action: Wallet['lastWalletAction'] | null;
  created_at: string;
  updated_at: string;
}): Wallet {
  return {
    balance: row.balance,
    lastRequestId: row.last_request_id || '',
    lastRequestOwnerId: row.last_request_owner_id || '',
    dailyEarnedDate: row.daily_earned_date || '',
    dailyEarnedCredits: row.daily_earned_credits || 0,
    lastWalletAction: row.last_wallet_action || undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function mapTransactionRow(row: {
  id: string;
  tx_type: Transaction['type'];
  amount: number;
  reference: string;
  request_id: string | null;
  occurred_at: string;
  balance_after: number;
}): Transaction {
  return {
    id: row.id,
    type: row.tx_type,
    amount: row.amount,
    reference: row.reference,
    requestId: row.request_id || undefined,
    timestamp: new Date(row.occurred_at),
    balanceAfter: row.balance_after,
  };
}

export async function readWalletState(uid: string): Promise<{
  wallet: Wallet;
  transactions: Transaction[];
}> {
  const supabase = createTestSupabaseAdminClient();
  const { data: walletRow, error: walletError } = await supabase
    .from('wallets')
    .select('*')
    .eq('user_uid', uid)
    .maybeSingle();

  if (walletError || !walletRow) {
    throw new Error(`Missing wallet for ${uid}: ${walletError?.message ?? 'not found'}`);
  }

  const { data: transactionRows, error: transactionsError } = await supabase
    .from('wallet_transactions')
    .select('*')
    .eq('user_uid', uid)
    .order('occurred_at', { ascending: true });

  if (transactionsError) {
    throw new Error(`Failed to read wallet transactions: ${transactionsError.message}`);
  }

  return {
    wallet: mapWalletRow(walletRow),
    transactions: (transactionRows || []).map(mapTransactionRow),
  };
}

export async function getWalletBalance(uid: string): Promise<number> {
  const { wallet } = await readWalletState(uid);
  return wallet.balance;
}

export async function replaceWalletState(
  userId: string,
  wallet: Wallet,
  transactions: Transaction[]
): Promise<void> {
  await withDatabase(async (database) => {
    await database.query('begin');
    try {
      await database.query(
        `insert into public.wallets (
           user_uid, balance, last_request_id, last_request_owner_id,
           daily_earned_date, daily_earned_credits, last_wallet_action, created_at, updated_at
         )
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         on conflict (user_uid) do update set
           balance = excluded.balance,
           last_request_id = excluded.last_request_id,
           last_request_owner_id = excluded.last_request_owner_id,
           daily_earned_date = excluded.daily_earned_date,
           daily_earned_credits = excluded.daily_earned_credits,
           last_wallet_action = excluded.last_wallet_action,
           updated_at = excluded.updated_at`,
        [
          userId,
          wallet.balance,
          wallet.lastRequestId || '',
          wallet.lastRequestOwnerId || '',
          wallet.dailyEarnedDate || null,
          wallet.dailyEarnedCredits || 0,
          wallet.lastWalletAction || null,
          wallet.createdAt,
          wallet.updatedAt,
        ]
      );
      await database.query('delete from public.wallet_transactions where user_uid = $1', [userId]);

      for (const transaction of transactions) {
        await database.query(
          `insert into public.wallet_transactions (
             id, user_uid, tx_type, amount, reference, request_id, occurred_at, balance_after
           )
           values ($1, $2, $3, $4, $5, $6, $7, $8);`,
          [
            transaction.id,
            userId,
            transaction.type,
            transaction.amount,
            transaction.reference,
            transaction.requestId || null,
            transaction.timestamp,
            transaction.balanceAfter,
          ]
        );
      }

      await database.query('commit');
    } catch (error) {
      await database.query('rollback');
      throw error;
    }
  });
}
