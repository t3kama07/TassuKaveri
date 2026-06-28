import { expect, test } from '../fixtures/app.fixtures';
import { login, logout } from '../helpers/auth';
import { createSupabaseAdminClient } from '../../../lib/supabaseAdmin';
import {
  getWalletFromSupabase,
  getWalletTransactionsFromSupabase,
  replaceWalletStateInSupabase,
} from '../../../lib/supabaseWalletStore';
import type { Transaction, Wallet } from '../../../types/wallet';

async function setProfileRole(uid: string, role: 'admin' | 'user') {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from('profiles')
    .update({
      role,
      updated_at: new Date().toISOString(),
    })
    .eq('uid', uid);

  if (error) {
    throw new Error(`Failed to set profile role: ${error.message}`);
  }
}

async function setProfileFrozen(uid: string, frozen: boolean) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from('profiles')
    .update({
      frozen,
      updated_at: new Date().toISOString(),
    })
    .eq('uid', uid);

  if (error) {
    throw new Error(`Failed to set profile frozen state: ${error.message}`);
  }
}

async function getProfileFrozen(uid: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('frozen')
    .eq('uid', uid)
    .maybeSingle<{ frozen: boolean }>();

  if (error) {
    throw new Error(`Failed to read profile frozen state: ${error.message}`);
  }

  return Boolean(data?.frozen);
}

async function getWalletBalance(uid: string) {
  const wallet = await getWalletFromSupabase(uid);
  if (!wallet) {
    throw new Error(`Missing wallet for ${uid}`);
  }

  return wallet.balance;
}

async function readWalletState(uid: string): Promise<{
  wallet: Wallet;
  transactions: Transaction[];
}> {
  const wallet = await getWalletFromSupabase(uid);
  if (!wallet) {
    throw new Error(`Missing wallet for ${uid}`);
  }

  return {
    wallet,
    transactions: await getWalletTransactionsFromSupabase(uid),
  };
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
      await replaceWalletStateInSupabase({
        userId: targetUserId,
        wallet: originalWalletState.wallet,
        transactions: originalWalletState.transactions,
      });
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
});
