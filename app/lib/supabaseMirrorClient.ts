import { Pet } from '@/types/pet';
import { Request } from '@/types/request';
import { UserProfile } from '@/types/profile';
import { AvailabilitySlot } from '@/types/availability';
import { PublicUserProfile } from '@/types/profile';
import { Transaction, Wallet } from '@/types/wallet';
import { AppNotification } from '@/types/notification';
import { FavoriteSitter } from '@/types/favorite';
import type { SupabasePublicProfileInput } from './supabasePublicProfileStore';
import type {
  SupabaseConversationInput,
  SupabaseMessageInput,
} from './supabaseMessageStore';
import { getCurrentAuthUser, getSupabaseAccessToken } from './supabaseAuthClient';

type PetMirrorAction = 'upsert' | 'replace' | 'delete';

function isSupabaseMirrorEnabled(): boolean {
  return typeof window !== 'undefined' && Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
}

async function getCurrentUserIdToken(expectedUid: string): Promise<string | null> {
  if (!isSupabaseMirrorEnabled()) {
    return null;
  }

  const currentUser = await getCurrentAuthUser();
  if (!currentUser || currentUser.uid !== expectedUid) {
    return null;
  }

  return getSupabaseAccessToken();
}

async function postMirrorRequest(
  path: string,
  expectedUid: string,
  payload: unknown
): Promise<void> {
  const idToken = await getCurrentUserIdToken(expectedUid);
  if (!idToken) {
    return;
  }

  const response = await fetch(path, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }
}

export async function mirrorProfileToSupabase(profile: UserProfile): Promise<void> {
  await postMirrorRequest('/api/supabase-sync/profile', profile.uid, { profile });
}

export async function syncProfileMetricsToSupabase(params: {
  actorId: string;
  targetUserId: string;
  relatedRequestId?: string;
  ratingAverage?: number;
  ratingCount?: number;
  trustScore?: number;
  recalculateTrustScore?: boolean;
  frozen?: boolean;
}): Promise<void> {
  await postMirrorRequest('/api/supabase-sync/profile-metrics', params.actorId, params);
}

export async function mirrorPetsToSupabase(
  ownerId: string,
  pets: Pet[],
  action: PetMirrorAction = 'upsert'
): Promise<void> {
  if (!pets.length && action === 'upsert') {
    return;
  }

  await postMirrorRequest('/api/supabase-sync/pets', ownerId, { action, ownerId, pets });
}

export async function deletePetsFromSupabase(
  ownerId: string,
  petIds: string[]
): Promise<void> {
  if (!petIds.length) {
    return;
  }

  await postMirrorRequest('/api/supabase-sync/pets', ownerId, {
    action: 'delete',
    ownerId,
    petIds,
  });
}

export async function mirrorPublicProfileToSupabase(
  publicProfile: SupabasePublicProfileInput | PublicUserProfile
): Promise<void> {
  await postMirrorRequest('/api/supabase-sync/public-profile', publicProfile.uid, {
    publicProfile,
  });
}

export async function replaceAvailabilitySlotsInSupabase(
  userId: string,
  slots: AvailabilitySlot[]
): Promise<void> {
  await postMirrorRequest('/api/supabase-sync/availability', userId, {
    userId,
    slots,
  });
}

export async function mirrorRequestToSupabase(
  request: Request,
  actorId: string = request.ownerId
): Promise<void> {
  await postMirrorRequest('/api/supabase-sync/request', actorId, {
    action: 'upsert',
    actorId,
    request,
  });
}

export async function deleteRequestFromSupabase(
  ownerId: string,
  requestId: string,
  actorId: string = ownerId
): Promise<void> {
  await postMirrorRequest('/api/supabase-sync/request', actorId, {
    action: 'delete',
    actorId,
    ownerId,
    requestId,
  });
}

export async function mirrorWalletStateToSupabase(params: {
  actorId: string;
  userId: string;
  requestId?: string;
  wallet: Wallet;
  transactions: Transaction[];
}): Promise<void> {
  await postMirrorRequest('/api/supabase-sync/wallet', params.actorId, params);
}

export async function mirrorNotificationToSupabase(params: {
  actorId: string;
  notification: AppNotification;
}): Promise<void> {
  await postMirrorRequest('/api/supabase-sync/notification', params.actorId, params);
}

export async function mirrorFavoriteToSupabase(params: {
  actorId: string;
  favorite: FavoriteSitter;
}): Promise<void> {
  await postMirrorRequest('/api/supabase-sync/favorite', params.actorId, {
    action: 'upsert',
    ...params,
  });
}

export async function deleteFavoriteFromSupabase(params: {
  actorId: string;
  ownerId: string;
  sitterId: string;
}): Promise<void> {
  await postMirrorRequest('/api/supabase-sync/favorite', params.actorId, {
    action: 'delete',
    ...params,
  });
}

export async function mirrorConversationToSupabase(params: {
  actorId: string;
  conversation: SupabaseConversationInput;
}): Promise<void> {
  await postMirrorRequest('/api/supabase-sync/message', params.actorId, {
    action: 'upsert-conversation',
    ...params,
  });
}

export async function mirrorMessageToSupabase(params: {
  actorId: string;
  conversation: SupabaseConversationInput;
  message: SupabaseMessageInput;
}): Promise<void> {
  await postMirrorRequest('/api/supabase-sync/message', params.actorId, {
    action: 'upsert-message',
    ...params,
  });
}

export async function markMessagesReadInSupabase(params: {
  actorId: string;
  conversationId: string;
  recipientId: string;
  messageIds: string[];
}): Promise<void> {
  if (!params.messageIds.length) {
    return;
  }

  await postMirrorRequest('/api/supabase-sync/message', params.actorId, {
    action: 'mark-read',
    ...params,
  });
}
