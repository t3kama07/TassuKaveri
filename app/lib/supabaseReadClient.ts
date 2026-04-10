import { getSupabaseAuthHeaders } from './supabaseAuthClient';

type SupabaseReadOptions = {
  requireAuth?: boolean;
};

export function isSupabaseReadEnabled(): boolean {
  return typeof window !== 'undefined' && Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
}

export async function fetchSupabaseReadJson<T>(
  path: string,
  options: SupabaseReadOptions = {}
): Promise<T> {
  if (!isSupabaseReadEnabled()) {
    throw new Error('Supabase reads are not enabled');
  }

  const headers: HeadersInit = options.requireAuth
    ? await getSupabaseAuthHeaders()
    : {};

  const response = await fetch(path, {
    method: 'GET',
    headers,
    cache: 'no-store',
  });

  const responseText = await response.text();
  if (!response.ok) {
    let errorMessage = `Supabase read request failed (${response.status})`;

    if (responseText) {
      try {
        const payload = JSON.parse(responseText) as { error?: string };
        errorMessage = payload.error || responseText;
      } catch {
        errorMessage = responseText;
      }
    }

    throw new Error(errorMessage);
  }

  return responseText ? (JSON.parse(responseText) as T) : ({} as T);
}
