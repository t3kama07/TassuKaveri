import { expect, test } from '../fixtures/app.fixtures';
import { login } from '../helpers/auth';

test.describe('Role-based Access', () => {
  test('blocks a normal member from using admin tools', async ({ page, appUsers }) => {
    await login(page, appUsers.accessMember);
    await page.goto('/admin');

    await expect(page.getByRole('heading', { name: 'Admin Tools', exact: true })).toBeVisible();
    await expect(page.getByText('This page is only for admins.')).toBeVisible();
  });
});
