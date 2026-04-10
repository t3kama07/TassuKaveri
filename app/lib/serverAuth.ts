import { createSupabaseAdminClient } from './supabaseAdmin';

export interface VerifiedSessionUser {
  uid: string;
  email: string | null;
  emailVerified: boolean;
}

export function readBearerToken(headers: Headers): string | null {
  const authorization = headers.get('authorization') ?? '';
  if (!authorization.startsWith('Bearer ')) {
    return null;
  }

  const token = authorization.slice('Bearer '.length).trim();
  return token || null;
}

export async function verifySessionToken(
  accessToken: string
): Promise<VerifiedSessionUser | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.auth.getUser(accessToken);

  if (error || !data.user) {
    return null;
  }

  return {
    uid: data.user.id,
    email: data.user.email ?? null,
    emailVerified: Boolean(data.user.email_confirmed_at ?? data.user.confirmed_at),
  };
}
