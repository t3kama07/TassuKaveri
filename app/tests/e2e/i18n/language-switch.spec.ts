import { expect, test } from '@playwright/test';
import { fieldByLabel } from '../helpers/forms';
import { readRunUsers } from '../helpers/runtime';

test.describe('English and Finnish language switching', () => {
  test('defaults to Finnish and switches every public page to English', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => window.localStorage.removeItem('tassukaveri-language'));
    await page.reload();

    await expect(page.locator('html')).toHaveAttribute('lang', 'fi');
    await expect(page.getByRole('link', { name: 'Kirjaudu', exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'EN', exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByRole('link', { name: 'Log in', exact: true })).toBeVisible();

    await page.goto('/contact.html');
    await expect(page.getByRole('heading', { name: 'We are happy to hear from you.', exact: true })).toBeVisible();

    await page.goto('/blog/lemmikinhoito-oulussa.html');
    await expect(page.getByRole('heading', { name: 'Pet care in Oulu – the best options for pet owners', exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'FI', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Lemmikinhoito Oulussa – parhaat vaihtoehdot lemmikinomistajille', exact: true })).toBeVisible();
  });

  test('keeps the switch available after login and across private pages', async ({ page }) => {
    const user = readRunUsers().users.accessMember;
    await page.goto('/login');
    await page.getByRole('button', { name: 'EN', exact: true }).click();

    const form = page.locator('form');
    await fieldByLabel(form, 'Email').fill(user.email);
    await fieldByLabel(form, 'Password').fill(user.password);
    await form.getByRole('button', { name: 'Log in', exact: true }).click();
    await page.waitForURL(/\/dashboard$/);

    await page.getByRole('button', { name: 'FI', exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'fi');
    await expect(page.getByRole('button', { name: 'Kirjaudu ulos', exact: true })).toBeVisible();

    await page.goto('/exchange');
    await expect(page.getByRole('heading', { name: 'Pyydä lemmikinhoitoa tai tarjoa apuasi', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'EN', exact: true })).toBeVisible();

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', 'fi');
    await expect(page.getByRole('heading', { name: 'Pyydä lemmikinhoitoa tai tarjoa apuasi', exact: true })).toBeVisible();
  });
});
