import { expect, test } from '../fixtures/app.fixtures';
import { login, logout, signUp } from '../helpers/auth';
import { fieldByLabel } from '../helpers/forms';
import { uniqueUiSignupEmail } from '../helpers/runtime';

test.describe('Authentication', () => {
  test('redirects guests away from protected pages', async ({ page }) => {
    await page.goto('/profile');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'Log in', exact: true })).toBeVisible();
  });

  test('shows validation and creates a new user account', async ({ page }) => {
    const email = uniqueUiSignupEmail('playwright-signup');
    const password = 'Playwright123!';

    await signUp(page, {
      name: 'Playwright Signup User',
      location: 'Oulu',
      email,
      password,
      confirmPassword: `${password}x`,
    });

    await page.getByRole('button', { name: 'Create account', exact: true }).click();
    await expect(page.getByText('The passwords do not match.')).toBeVisible();

    const form = page.locator('form');
    const passwords = form.locator('input[type="password"]');
    await passwords.nth(1).fill(password);
    await page.getByRole('button', { name: 'Create account', exact: true }).click();

    const reachedDashboard = await page
      .waitForURL(/\/dashboard$/, { timeout: 10000 })
      .then(() => true)
      .catch(() => false);

    if (reachedDashboard) {
      await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
      return;
    }

    await expect(page).toHaveURL(/\/signup$/);
    const rateLimitError = page.getByText(
      /Too many signup emails were sent recently\./i
    );

    if (await rateLimitError.isVisible()) {
      await expect(rateLimitError).toBeVisible();
      return;
    }

    await expect(
      page.getByText(/Account created for .*Check your email to confirm it, then log in\./i)
    ).toBeVisible();
  });

  test('supports logout and login roundtrip for a confirmed account', async ({ page, appUsers }) => {
    await login(page, {
      email: appUsers.accessMember.email,
      password: appUsers.accessMember.password,
    });
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();

    await logout(page);
    await login(page, {
      email: appUsers.accessMember.email,
      password: appUsers.accessMember.password,
    });
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
  });

  test('shows a friendly error for invalid login', async ({ page, appUsers }) => {
    await page.goto('/login');

    const form = page.locator('form');
    await fieldByLabel(form, 'Email').fill(appUsers.accessMember.email);
    await fieldByLabel(form, 'Password').fill('DefinitelyWrong123!');
    await page.getByRole('button', { name: 'Log in', exact: true }).click();

    await expect(page.getByText(/We could not log you in\./i)).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });
});
