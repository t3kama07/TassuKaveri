import { expect, test } from '../fixtures/app.fixtures';
import { login, logout } from '../helpers/auth';
import {
  deleteAdminActionLogsForTarget,
  getAdminActionLogsForTarget,
  getProfileFrozen,
  getWalletBalance,
  readWalletState,
  replaceWalletState,
  setProfileFrozen,
  setProfileRole,
} from '../helpers/admin';

async function getCurrentAccessToken(page: Parameters<typeof login>[0]): Promise<string> {
  return page.evaluate(() => {
    const storageKey = Object.keys(window.localStorage).find(
      (key) => key.startsWith('sb-') && key.endsWith('-auth-token')
    );
    const storedSession = storageKey ? window.localStorage.getItem(storageKey) : null;
    const session = storedSession ? (JSON.parse(storedSession) as { access_token?: string }) : null;
    if (!session?.access_token) {
      throw new Error('Supabase access token not found');
    }
    return session.access_token;
  });
}

function dashboardCreditsCard(page: Parameters<typeof login>[0]) {
  return page.locator('div').filter({
    has: page.getByText('Credits', { exact: true }),
    hasText: 'Spend credits for care.',
  });
}

test.describe('Role-based Access', () => {
  test('blocks a normal member from using admin tools', async ({ page, appUsers }) => {
    await login(page, appUsers.accessMember);
    await page.goto('/admin');

    await expect(page.getByRole('heading', { name: 'Moderation Dashboard', exact: true })).toBeVisible();
    await expect(page.getByText('This page is only for admins.')).toBeVisible();
  });

  test('shows moderation tools for an admin member', async ({ page, appUsers }) => {
    await setProfileRole(appUsers.profileOwner.uid, 'admin');

    try {
      await login(page, appUsers.profileOwner);
      await page.goto('/admin');

      await expect(page.getByRole('heading', { name: 'Moderation Dashboard', exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Refresh queue', exact: true })).toBeVisible();
      await expect(page.getByRole('tab', { name: 'Users & Credits', exact: true })).toHaveAttribute(
        'aria-selected',
        'true'
      );
      await expect(page.getByRole('heading', { name: 'Credit Controls', exact: true })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Users & Credits', exact: true })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Target ID', exact: true })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Users name', exact: true })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Email address', exact: true })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Credit amount', exact: true })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Date Reg', exact: true })).toBeVisible();
      await expect(page.getByText(/Page 1 of \d+/)).toBeVisible();
      await page.getByPlaceholder('Search users').fill(appUsers.accessMember.name);
      await expect(page.getByRole('cell', { name: appUsers.accessMember.email, exact: true })).toBeVisible();

      await page.getByRole('tab', { name: 'Moderation', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Account Controls', exact: true })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Review Controls', exact: true })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Moderation Queue', exact: true })).toBeVisible();
      await expect(page.getByText('We could not load admin tools right now.')).not.toBeVisible();
    } finally {
      await setProfileRole(appUsers.profileOwner.uid, 'user');
    }
  });

  test('lets an admin add and deduct member credits', async ({ page, appUsers }) => {
    const targetUserId = appUsers.accessMember.uid;
    const originalWalletState = await readWalletState(targetUserId);
    await setProfileRole(appUsers.profileOwner.uid, 'admin');

    try {
      await login(page, appUsers.profileOwner);
      await page.goto('/admin');

      const creditControls = page
        .getByRole('heading', { name: 'Credit Controls', exact: true })
        .locator('..');
      await page.getByPlaceholder('Search users').fill(appUsers.accessMember.email);
      const targetUserRow = page.getByRole('row', {
        name: new RegExp(appUsers.accessMember.email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
      });

      await creditControls.getByPlaceholder('Target user ID').fill(targetUserId);
      await creditControls.getByPlaceholder('Credits').fill('2');
      await creditControls.getByPlaceholder('Reason or internal note').fill('Playwright add');
      await creditControls.getByRole('button', { name: 'Add credits', exact: true }).click();
      await expect(page.getByText('Credits added.', { exact: true })).toBeVisible();
      await expect.poll(() => getWalletBalance(targetUserId)).toBe(originalWalletState.wallet.balance + 2);
      await expect(targetUserRow).toContainText(String(originalWalletState.wallet.balance + 2));

      await creditControls.getByPlaceholder('Target user ID').fill(targetUserId);
      await creditControls.getByPlaceholder('Credits').fill('1');
      await creditControls.getByPlaceholder('Reason or internal note').fill('Playwright deduct');
      await creditControls.getByRole('button', { name: 'Deduct credits', exact: true }).click();
      await expect(page.getByText('Credits deducted.', { exact: true })).toBeVisible();
      await expect.poll(() => getWalletBalance(targetUserId)).toBe(originalWalletState.wallet.balance + 1);
      await expect(targetUserRow).toContainText(String(originalWalletState.wallet.balance + 1));

      await logout(page);
      await login(page, appUsers.accessMember);
      await expect(dashboardCreditsCard(page).getByText(String(originalWalletState.wallet.balance + 1), { exact: true })).toBeVisible();
    } finally {
      await replaceWalletState(
        targetUserId,
        originalWalletState.wallet,
        originalWalletState.transactions
      );
      await setProfileRole(appUsers.profileOwner.uid, 'user');
    }
  });

  test('does not let an admin freeze another admin account', async ({ page, appUsers }) => {
    await setProfileRole(appUsers.profileOwner.uid, 'admin');
    await setProfileFrozen(appUsers.profileOwner.uid, false);

    try {
      await login(page, appUsers.profileOwner);
      await page.goto('/admin');
      await page.getByRole('tab', { name: 'Moderation', exact: true }).click();

      const accountControls = page
        .getByRole('heading', { name: 'Account Controls', exact: true })
        .locator('..');
      await accountControls.getByPlaceholder('Target user ID').fill(appUsers.profileOwner.uid);
      await accountControls.getByPlaceholder('Reason or internal note').fill('Admin freeze protection');
      await accountControls.getByRole('button', { name: 'Freeze account', exact: true }).click();

      await expect(page.getByText('Admin accounts cannot be frozen')).toBeVisible();
      await expect.poll(() => getProfileFrozen(appUsers.profileOwner.uid)).toBe(false);
    } finally {
      await setProfileFrozen(appUsers.profileOwner.uid, false);
      await setProfileRole(appUsers.profileOwner.uid, 'user');
    }
  });

  test('blocks a frozen member at the API layer and records freeze history', async ({
    page,
    appUsers,
  }) => {
    const adminUser = appUsers.profileOwner;
    const targetUser = appUsers.accessMember;
    const freezeReason = `Playwright safety review ${Date.now()}`;
    const unfreezeReason = `Playwright appeal approved ${Date.now()}`;

    await setProfileRole(adminUser.uid, 'admin');
    await setProfileFrozen(targetUser.uid, false);
    await deleteAdminActionLogsForTarget(targetUser.uid);

    try {
      await login(page, adminUser);
      await page.goto('/admin');
      await page.getByRole('tab', { name: 'Moderation', exact: true }).click();

      const accountControls = page
        .getByRole('heading', { name: 'Account Controls', exact: true })
        .locator('..');
      await accountControls.getByPlaceholder('Target user ID').fill(targetUser.uid);
      await accountControls.getByPlaceholder('Reason or internal note').fill(freezeReason);
      await accountControls.getByRole('button', { name: 'Freeze account', exact: true }).click();

      await expect(page.getByText('Account frozen.', { exact: true })).toBeVisible();
      await expect.poll(() => getProfileFrozen(targetUser.uid)).toBe(true);
      await expect(page.getByTestId('admin-account-action-log')).toContainText(freezeReason);

      const freezeLogs = await getAdminActionLogsForTarget(targetUser.uid);
      expect(freezeLogs[0]).toEqual({
        action: 'freeze-account',
        reason: freezeReason,
        adminUid: adminUser.uid,
      });

      await logout(page);
      await login(page, targetUser);
      await expect(page.getByRole('heading', { name: 'Account paused', exact: true })).toBeVisible();

      const accessToken = await getCurrentAccessToken(page);
      const walletApiStatus = await page.evaluate(
        async ({ token, uid }) => {
          const response = await fetch(`/api/supabase-read/wallet?userId=${encodeURIComponent(uid)}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          return response.status;
        },
        { token: accessToken, uid: targetUser.uid }
      );
      expect(walletApiStatus).toBe(401);

      await logout(page);
      await login(page, adminUser);
      await page.goto('/admin');
      await page.getByRole('tab', { name: 'Moderation', exact: true }).click();

      const unfreezeControls = page
        .getByRole('heading', { name: 'Account Controls', exact: true })
        .locator('..');
      await unfreezeControls.getByPlaceholder('Target user ID').fill(targetUser.uid);
      await unfreezeControls.getByPlaceholder('Reason or internal note').fill(unfreezeReason);
      await unfreezeControls.getByRole('button', { name: 'Unfreeze account', exact: true }).click();

      await expect(page.getByText('Account unfrozen.', { exact: true })).toBeVisible();
      await expect.poll(() => getProfileFrozen(targetUser.uid)).toBe(false);
      await expect(page.getByTestId('admin-account-action-log')).toContainText(unfreezeReason);

      const actionLogs = await getAdminActionLogsForTarget(targetUser.uid);
      expect(actionLogs.slice(0, 2)).toEqual([
        {
          action: 'unfreeze-account',
          reason: unfreezeReason,
          adminUid: adminUser.uid,
        },
        {
          action: 'freeze-account',
          reason: freezeReason,
          adminUid: adminUser.uid,
        },
      ]);
    } finally {
      await setProfileFrozen(targetUser.uid, false);
      await setProfileRole(adminUser.uid, 'user');
      await deleteAdminActionLogsForTarget(targetUser.uid);
    }
  });
});
