import { expect, type Page } from '@playwright/test';
import type { E2EUserAccount } from './runtime';
import { fieldByLabel } from './forms';

export async function login(page: Page, user: Pick<E2EUserAccount, 'email' | 'password'>) {
  await page.addInitScript(() => {
    window.localStorage.setItem('tassukaveri-language', 'en');
  });
  await page.goto('/login');

  const form = page.locator('form');
  await fieldByLabel(form, 'Email').fill(user.email);
  await fieldByLabel(form, 'Password').fill(user.password);
  await page.getByRole('button', { name: 'Log in', exact: true }).click();

  await page.waitForURL(/\/dashboard$/, { timeout: 30_000 });
  await expect(page.getByRole('button', { name: 'Logout', exact: true })).toBeVisible({
    timeout: 15_000,
  });
}

export async function logout(page: Page) {
  await page.getByRole('button', { name: 'Logout', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Log in', exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/(?:login)?$/);
}

export async function signUp(
  page: Page,
  values: {
    name: string;
    location: string;
    email: string;
    password: string;
    confirmPassword?: string;
  }
) {
  await page.addInitScript(() => {
    window.localStorage.setItem('tassukaveri-language', 'en');
  });
  await page.goto('/signup');

  const form = page.locator('form');
  await fieldByLabel(form, 'Name').fill(values.name);
  await fieldByLabel(form, 'City').selectOption(values.location);
  await fieldByLabel(form, 'Email').fill(values.email);

  const passwords = form.locator('input[type="password"]');
  await passwords.nth(0).fill(values.password);
  await passwords.nth(1).fill(values.confirmPassword ?? values.password);
  await form.getByLabel('I accept the Terms of Service.').check();
  await form.getByLabel('I accept the Privacy Policy.').check();
}
