import { expect, test } from '../fixtures/app.fixtures';
import { login, logout, signUp } from '../helpers/auth';
import { fieldByLabel } from '../helpers/forms';
import { uniqueUiSignupEmail } from '../helpers/runtime';

test.describe('Authentication', () => {
  test('redirects guests away from protected pages', async ({ page }) => {
    await page.goto('/profile');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'Login', exact: true })).toBeVisible();
  });

  test('shows validation, signs up a new user, and supports logout/login roundtrip', async ({ page }) => {
    const email = uniqueUiSignupEmail('playwright-signup');
    const password = 'Playwright123!';

    await signUp(page, {
      name: 'Playwright Signup User',
      location: 'Oulu',
      email,
      password,
      confirmPassword: `${password}x`,
    });

    await page.getByRole('button', { name: 'Sign Up', exact: true }).click();
    await expect(page.getByText('Passwords do not match')).toBeVisible();

    const form = page.locator('form');
    const passwords = form.locator('input[type="password"]');
    await passwords.nth(1).fill(password);
    await page.getByRole('button', { name: 'Sign Up', exact: true }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();

    await logout(page);
    await login(page, { email, password });
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
  });

  test('shows a friendly error for invalid login', async ({ page, appUsers }) => {
    await page.goto('/login');

    const form = page.locator('form');
    await fieldByLabel(form, 'Email').fill(appUsers.accessMember.email);
    await fieldByLabel(form, 'Password').fill('DefinitelyWrong123!');
    await page.getByRole('button', { name: 'Login', exact: true }).click();

    await expect(page.getByText(/Failed to login:/i)).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });
});
