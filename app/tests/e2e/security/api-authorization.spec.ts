import { expect, test } from '../fixtures/app.fixtures';
import { login } from '../helpers/auth';

async function getAccessToken(page: Parameters<typeof login>[0]): Promise<string> {
  return page.evaluate(() => {
    const authStorageKey = Object.keys(window.localStorage).find(
      (key) => key.startsWith('sb-') && key.endsWith('-auth-token')
    );
    if (!authStorageKey) {
      throw new Error('Supabase auth storage key not found');
    }

    const session = JSON.parse(window.localStorage.getItem(authStorageKey) || '{}') as {
      access_token?: string;
    };
    if (!session.access_token) {
      throw new Error('Supabase access token not found');
    }
    return session.access_token;
  });
}

test.describe('API authorization', () => {
  test('rejects forged server-owned state and unauthorized mutations', async ({
    page,
    request,
    appUsers,
  }) => {
    const member = appUsers.accessMember;
    const otherMember = appUsers.profileOwner;
    await login(page, member);
    const accessToken = await getAccessToken(page);
    const headers = { Authorization: `Bearer ${accessToken}` };

    const profileRead = await request.get(`/api/supabase-read/profile?uid=${member.uid}`, {
      headers,
    });
    expect(profileRead.ok()).toBeTruthy();
    const { profile } = (await profileRead.json()) as {
      profile: Record<string, unknown>;
    };

    const profileWrite = await request.post('/api/supabase-sync/profile', {
      headers,
      data: {
        profile: {
          ...profile,
          uid: member.uid,
          email: member.email,
          role: 'admin',
          trustScore: 999,
          ratingAverage: 5,
          ratingCount: 999,
        },
      },
    });
    expect(profileWrite.ok()).toBeTruthy();

    const profileAfterWrite = await request.get(
      `/api/supabase-read/profile?uid=${member.uid}`,
      { headers }
    );
    const { profile: preservedProfile } = (await profileAfterWrite.json()) as {
      profile: Record<string, unknown>;
    };
    expect(preservedProfile.role).toBe('user');
    expect(preservedProfile.trustScore).toBe(profile.trustScore);
    expect(preservedProfile.ratingCount).toBe(profile.ratingCount);

    const requestWithoutActor = await request.post('/api/supabase-sync/request', {
      headers,
      data: {
        action: 'delete',
        ownerId: member.uid,
        requestId: 'forged-request-id',
      },
    });
    expect(requestWithoutActor.status()).toBe(403);

    const walletForgery = await request.post('/api/supabase-sync/wallet', {
      headers,
      data: {
        actorId: member.uid,
        userId: member.uid,
        wallet: { balance: 999999, lastWalletAction: 'manual_earn' },
        transactions: [],
      },
    });
    expect(walletForgery.status()).toBe(403);

    const crossWalletRead = await request.get(
      `/api/supabase-read/wallet?userId=${otherMember.uid}&requestId=forged-request-id`,
      { headers }
    );
    expect(crossWalletRead.status()).toBe(403);

    const unauthorizedConversation = await request.post('/api/supabase-sync/message', {
      headers,
      data: {
        action: 'upsert-conversation',
        actorId: member.uid,
        conversation: {
          conversationId: `forged-${Date.now()}`,
          ownerId: member.uid,
          requestId: 'missing-accepted-request',
          sitterId: otherMember.uid,
          ownerName: member.name,
          sitterName: otherMember.name,
          participants: [member.uid, otherMember.uid],
        },
      },
    });
    expect(unauthorizedConversation.status()).toBe(403);
  });
});
