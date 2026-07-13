import { createClient, type Session } from '@supabase/supabase-js';
import { expect, test, type Page } from '@playwright/test';
import { LEGAL_DOCUMENT_VERSIONS } from '../../../lib/legalPolicy';
import {
  clearLegalAcceptances,
  createTestSupabaseAdminClient,
  deletePlaywrightTestUsers,
  hasLatestLegalAcceptances,
  restoreLatestLegalAcceptances,
  withDatabase,
} from '../helpers/admin';
import { readRunUsers } from '../helpers/runtime';

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

async function createPasswordSession(email: string, password: string): Promise<Session> {
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
  if (!publishableKey) throw new Error('Missing Supabase publishable key');
  const client = createClient(
    requiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
    publishableKey,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    throw new Error(error?.message || 'Could not create test Supabase session');
  }
  return data.session;
}

async function installOAuthReturnState(
  page: Page,
  session: Session,
  intent: 'login' | 'signup',
  includeLegalConsent: boolean
) {
  const projectRef = new URL(requiredEnv('NEXT_PUBLIC_SUPABASE_URL')).hostname.split('.')[0];
  await page.addInitScript(({ authStorageKey, authSession, authIntent, consent }) => {
    window.localStorage.setItem(authStorageKey, JSON.stringify(authSession));
    window.localStorage.setItem('tassukaveri-language', 'en');
    window.localStorage.setItem(
      'tassukaveri_google_auth_intent_pending',
      JSON.stringify({ intent: authIntent, createdAt: Date.now() })
    );
    if (consent) {
      window.localStorage.setItem(
        'tassukaveri_google_signup_legal_pending',
        JSON.stringify({ ...consent, createdAt: Date.now() })
      );
    }
  }, {
    authStorageKey: `sb-${projectRef}-auth-token`,
    authSession: session,
    authIntent: intent,
    consent: includeLegalConsent
      ? {
          termsVersion: LEGAL_DOCUMENT_VERSIONS.terms_of_service,
          privacyVersion: LEGAL_DOCUMENT_VERSIONS.privacy_policy,
        }
      : null,
  });
}

test.describe('Google authentication registration boundary', () => {
  test('finalizes signup consent without showing the legal gate again', async ({ page }) => {
    const user = readRunUsers().users.accessMember;
    await clearLegalAcceptances(user.uid);

    try {
      const session = await createPasswordSession(user.email, user.password);
      await installOAuthReturnState(page, session, 'signup', true);
      await page.goto('/auth/callback?intent=signup');
      await page.waitForURL(/\/dashboard$/);

      await expect(page.getByRole('heading', { name: 'Accept updated documents' })).not.toBeVisible();
      await expect.poll(() => hasLatestLegalAcceptances(user.uid)).toBe(true);
      await expect.poll(() => page.evaluate(
        () => window.localStorage.getItem('tassukaveri_google_signup_legal_pending')
      )).toBeNull();
    } finally {
      await restoreLatestLegalAcceptances(user.uid);
    }
  });

  test('rejects Google login when the authenticated user has no registered profile', async ({ page }) => {
    const email = `playwright-signup-${Date.now()}@gmail.com`;
    const password = process.env.PLAYWRIGHT_TEST_PASSWORD || 'Playwright123!';
    const admin = createTestSupabaseAdminClient();
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error || !data.user) throw new Error(error?.message || 'Could not create auth-only user');

    try {
      const session = await createPasswordSession(email, password);
      await installOAuthReturnState(page, session, 'login', false);
      await page.goto('/auth/callback?intent=login');

      await expect(page).toHaveURL(/\/signup\?from=google-login$/);
      await expect(page.getByRole('main').getByText('Please register first before using Google login.')).toBeVisible();
      const profileCount = await withDatabase(async (database) => {
        const result = await database.query<{ count: string }>(
          'select count(*)::text as count from public.profiles where uid = $1',
          [data.user.id]
        );
        return Number(result.rows[0]?.count || 0);
      });
      expect(profileCount).toBe(0);
    } finally {
      await deletePlaywrightTestUsers([data.user.id]);
    }
  });
});
