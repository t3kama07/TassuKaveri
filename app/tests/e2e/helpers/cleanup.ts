import pg from 'pg';
import { createSupabaseAdminClient } from '../../../lib/supabaseAdmin';

const { Client } = pg;

export interface PlaywrightAuthUser {
  id: string;
  email: string;
  createdAt: string;
}

function isPlaywrightTestEmail(email: string): boolean {
  return (
    /^pw[a-z0-9]+user\d+@example\.com$/i.test(email) ||
    /^playwright-signup@example\.invalid$/i.test(email) ||
    /^playwright-signup-\d+@gmail\.com$/i.test(email)
  );
}

function getDatabaseUrl(): string {
  const databaseUrl = process.env.SUPABASE_DB_URL;
  if (!databaseUrl) {
    throw new Error('Missing SUPABASE_DB_URL for Playwright cleanup');
  }

  const normalizedUrl = new URL(databaseUrl);
  normalizedUrl.searchParams.delete('sslmode');
  return normalizedUrl.toString();
}

export async function listPlaywrightAuthUsers(): Promise<PlaywrightAuthUser[]> {
  const supabase = createSupabaseAdminClient();
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

  const database = new Client({
    connectionString: getDatabaseUrl(),
    ssl: { rejectUnauthorized: false },
  });

  await database.connect();
  try {
    await database.query('begin');
    await database.query(
      `with removed_conversations as (
         delete from public.conversations
         where owner_uid = any($1::text[]) or sitter_uid = any($1::text[])
       ), removed_requests as (
         delete from public.requests
         where owner_uid = any($1::text[])
            or sitter_uid = any($1::text[])
            or requested_sitter_uid = any($1::text[])
       ), removed_reports as (
         delete from public.reports
         where reporter_uid = any($1::text[])
            or target_user_uid = any($1::text[])
            or target_owner_uid = any($1::text[])
       )
       delete from public.profiles where uid = any($1::text[]);`,
      [ids]
    );
    await database.query('commit');
  } catch (error) {
    await database.query('rollback');
    throw error;
  } finally {
    await database.end();
  }

  const supabase = createSupabaseAdminClient();
  for (const id of ids) {
    const { error } = await supabase.auth.admin.deleteUser(id);
    if (error) {
      throw new Error(`Failed to delete Playwright auth user ${id}: ${error.message}`);
    }
  }
}
