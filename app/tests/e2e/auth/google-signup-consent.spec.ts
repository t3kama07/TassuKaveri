import { expect, test } from '@playwright/test';
import { LEGAL_DOCUMENT_VERSIONS } from '../../../lib/legalPolicy';
import {
  clearLegalAcceptances,
  hasLatestLegalAcceptances,
  restoreLatestLegalAcceptances,
} from '../helpers/admin';
import { login } from '../helpers/auth';
import { readRunUsers } from '../helpers/runtime';

test.describe('Google signup legal acceptance', () => {
  test('finalizes previously accepted documents without showing the gate again', async ({ page }) => {
    const user = readRunUsers().users.accessMember;
    await clearLegalAcceptances(user.uid);

    try {
      await page.goto('/');
      await page.evaluate((versions) => {
        window.sessionStorage.removeItem('tassukaveri_google_signup_legal_accepted');
        window.localStorage.setItem(
          'tassukaveri_google_signup_legal_pending',
          JSON.stringify({
            termsVersion: versions.terms,
            privacyVersion: versions.privacy,
            createdAt: Date.now(),
          })
        );
      }, {
        terms: LEGAL_DOCUMENT_VERSIONS.terms_of_service,
        privacy: LEGAL_DOCUMENT_VERSIONS.privacy_policy,
      });

      await login(page, user);

      await expect(page.getByRole('heading', { name: 'Accept updated documents' })).not.toBeVisible();
      await expect.poll(() => hasLatestLegalAcceptances(user.uid)).toBe(true);
      await expect.poll(() => page.evaluate(
        () => window.localStorage.getItem('tassukaveri_google_signup_legal_pending')
      )).toBeNull();
    } finally {
      await restoreLatestLegalAcceptances(user.uid);
    }
  });
});
