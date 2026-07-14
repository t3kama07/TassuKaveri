import { devices, expect, test } from '@playwright/test';

test.use({ ...devices['Pixel 5'] });

test.describe('Mobile public smoke', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('tassukaveri-language', 'en');
    });
  });

  test('opens the mobile menu and keeps auth forms usable', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('button', { name: 'FI', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'EN', exact: true })).toBeVisible();

    const menuButton = page.getByRole('button', { name: 'Open menu' });
    await expect(menuButton).toBeVisible();
    await menuButton.click();
    await expect(page.getByRole('link', { name: 'Blog' })).toBeVisible();

    await page.getByRole('link', { name: 'Log in' }).click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('textbox', { name: 'Email' })).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();

    await page.goto('/signup');
    await expect(page.getByLabel('Name')).toBeVisible();
    await expect(page.getByLabel('City')).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Email' })).toBeVisible();
  });
});
