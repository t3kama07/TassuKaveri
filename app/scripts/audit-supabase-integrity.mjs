import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(appRoot, '.env.local') });

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name} in .env.local`);
  }

  return value;
}

function createSupabaseAdminClient() {
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

async function listAllAuthUsers(supabase) {
  const users = [];
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 200,
    });

    if (error) {
      throw new Error(`Failed to list auth users: ${error.message}`);
    }

    users.push(...data.users);

    if (data.users.length < 200) {
      return users;
    }

    page += 1;
  }
}

async function selectAllRows(supabase, table, columns, orderColumn) {
  const rows = [];
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .order(orderColumn, { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) {
      throw new Error(`Failed to read ${table}: ${error.message}`);
    }

    rows.push(...(data ?? []));

    if (!data || data.length < pageSize) {
      return rows;
    }

    from += pageSize;
  }
}

function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

function summarizeIds(values, limit = 10) {
  return values.slice(0, limit);
}

function addMissingUserIssues(issues, type, rows, fields, validUserIds) {
  const missing = [];

  for (const row of rows) {
    for (const field of fields) {
      const value = row[field];
      if (typeof value === 'string' && value && !validUserIds.has(value)) {
        missing.push({
          tableId: row.id ?? `${field}:${value}`,
          field,
          missingUserId: value,
        });
      }
    }
  }

  if (missing.length > 0) {
    issues.push({
      type,
      count: missing.length,
      sample: summarizeIds(missing),
    });
  }
}

async function main() {
  const supabase = createSupabaseAdminClient();

  const [authUsers, profiles, publicProfiles, requests, conversations, messages] =
    await Promise.all([
      listAllAuthUsers(supabase),
      selectAllRows(supabase, 'profiles', 'uid,email,name,location', 'uid'),
      selectAllRows(supabase, 'public_profiles', 'uid,name,location', 'uid'),
      selectAllRows(
        supabase,
        'requests',
        'id,owner_uid,sitter_uid,requested_sitter_uid',
        'id'
      ),
      selectAllRows(
        supabase,
        'conversations',
        'id,owner_uid,sitter_uid,participants',
        'id'
      ),
      selectAllRows(
        supabase,
        'messages',
        'id,owner_uid,sitter_uid,sender_uid,recipient_uid',
        'id'
      ),
    ]);

  const authUsersById = new Map(authUsers.map((user) => [user.id, user]));
  const validAuthUserIds = new Set(authUsersById.keys());
  const validProfileIds = new Set(profiles.map((profile) => profile.uid));
  const issues = [];
  const warnings = [];

  const profilesWithoutAuth = profiles.filter((profile) => !validAuthUserIds.has(profile.uid));
  if (profilesWithoutAuth.length > 0) {
    issues.push({
      type: 'profiles_without_auth_users',
      count: profilesWithoutAuth.length,
      sample: summarizeIds(
        profilesWithoutAuth.map((profile) => ({
          uid: profile.uid,
          email: profile.email,
          name: profile.name,
        }))
      ),
    });
  }

  const profileEmailMismatches = profiles.filter((profile) => {
    const authUser = authUsersById.get(profile.uid);
    return authUser && normalizeEmail(profile.email) !== normalizeEmail(authUser.email);
  });
  if (profileEmailMismatches.length > 0) {
    issues.push({
      type: 'profile_email_mismatches',
      count: profileEmailMismatches.length,
      sample: summarizeIds(
        profileEmailMismatches.map((profile) => ({
          uid: profile.uid,
          profileEmail: profile.email,
          authEmail: authUsersById.get(profile.uid)?.email ?? null,
        }))
      ),
    });
  }

  const publicProfilesWithoutProfiles = publicProfiles.filter(
    (profile) => !validProfileIds.has(profile.uid)
  );
  if (publicProfilesWithoutProfiles.length > 0) {
    issues.push({
      type: 'public_profiles_without_profiles',
      count: publicProfilesWithoutProfiles.length,
      sample: summarizeIds(publicProfilesWithoutProfiles),
    });
  }

  addMissingUserIssues(issues, 'requests_with_missing_profile_users', requests, [
    'owner_uid',
    'sitter_uid',
    'requested_sitter_uid',
  ], validProfileIds);

  const conversationParticipantsMissingProfiles = [];
  for (const conversation of conversations) {
    if (!Array.isArray(conversation.participants)) {
      continue;
    }

    for (const participantId of conversation.participants) {
      if (typeof participantId === 'string' && participantId && !validProfileIds.has(participantId)) {
        conversationParticipantsMissingProfiles.push({
          tableId: conversation.id,
          field: 'participants',
          missingUserId: participantId,
        });
      }
    }
  }
  if (conversationParticipantsMissingProfiles.length > 0) {
    issues.push({
      type: 'conversation_participants_without_profiles',
      count: conversationParticipantsMissingProfiles.length,
      sample: summarizeIds(conversationParticipantsMissingProfiles),
    });
  }

  addMissingUserIssues(issues, 'conversations_with_missing_profile_users', conversations, [
    'owner_uid',
    'sitter_uid',
  ], validProfileIds);

  addMissingUserIssues(issues, 'messages_with_missing_profile_users', messages, [
    'owner_uid',
    'sitter_uid',
    'sender_uid',
    'recipient_uid',
  ], validProfileIds);

  const authUsersWithoutProfiles = authUsers.filter((user) => !validProfileIds.has(user.id));
  if (authUsersWithoutProfiles.length > 0) {
    warnings.push({
      type: 'auth_users_without_profiles',
      count: authUsersWithoutProfiles.length,
      sample: summarizeIds(
        authUsersWithoutProfiles.map((user) => ({
          uid: user.id,
          email: user.email ?? null,
        }))
      ),
    });
  }

  const report = {
    ok: issues.length === 0,
    summary: {
      authUsers: authUsers.length,
      profiles: profiles.length,
      publicProfiles: publicProfiles.length,
      requests: requests.length,
      conversations: conversations.length,
      messages: messages.length,
    },
    issues,
    warnings,
  };

  console.log(JSON.stringify(report, null, 2));

  if (issues.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
