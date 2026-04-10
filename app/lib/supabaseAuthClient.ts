import type { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { AuthUser } from '@/types/auth';

export function mapSupabaseUserToAuthUser(user: SupabaseUser): AuthUser {
  return {
    uid: user.id,
    email: user.email ?? null,
    emailVerified: Boolean(user.email_confirmed_at ?? user.confirmed_at),
  };
}

export async function getSupabaseAccessToken(): Promise<string> {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    throw new Error(error.message);
  }

  if (!session?.access_token) {
    throw new Error('Missing authenticated Supabase session');
  }

  return session.access_token;
}

export async function getCurrentAuthUser(): Promise<AuthUser | null> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw new Error(error.message);
  }

  return user ? mapSupabaseUserToAuthUser(user) : null;
}

export async function getSupabaseAuthHeaders(expectedUid?: string): Promise<HeadersInit> {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    throw new Error(error.message);
  }

  if (!session?.user || !session.access_token) {
    throw new Error('Missing authenticated Supabase session');
  }

  if (expectedUid && session.user.id !== expectedUid) {
    throw new Error('Authenticated Supabase user does not match expected actor');
  }

  return {
    Authorization: `Bearer ${session.access_token}`,
  };
}
