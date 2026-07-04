import 'server-only';

import { CreateRequestData, Request, RequestAudience, RequestReview, UpdateRequestData } from '@/types/request';
import { Transaction, Wallet } from '@/types/wallet';
import { getCityLocationPayload } from './locations';
import {
  assertNoMoneyLanguage,
  getTodayKey,
  REPEATED_PAIR_ACTIVITY_THRESHOLD,
} from './platformPolicy';
import { createSupabaseAdminClient } from './supabaseAdmin';
import { getAvailabilitySlotsFromSupabase } from './supabaseAvailabilityStore';
import {
  deleteConversationsForRequestFromSupabase,
  upsertConversationInSupabase,
} from './supabaseMessageStore';
import { upsertReportInSupabase } from './supabaseModerationStore';
import {
  deleteNotificationsForRequestFromSupabase,
  upsertNotificationInSupabase,
} from './supabaseNotificationStore';
import { getOwnerPetsFromSupabase } from './supabasePetStore';
import { getProfileFromSupabase } from './supabaseProfileStore';
import { getPublicProfileFromSupabase } from './supabasePublicProfileStore';
import {
  deleteRequestInSupabase,
  getCompletedSitsCountFromSupabase,
  getRequestByIdFromSupabase,
  getSitterRequestsFromSupabase,
  getUserRequestsFromSupabase,
  hasActiveRequestConflictFromSupabase,
  upsertRequestInSupabase,
} from './supabaseRequestStore';
import {
  getWalletFromSupabase,
  getWalletTransactionsFromSupabase,
  replaceWalletStateInSupabase,
} from './supabaseWalletStore';
import { calculateTrustScore } from './trustScore';

const MILLISECONDS_PER_HOUR = 60 * 60 * 1000;
const CARE_TYPES = new Set<Request['careType']>([
  'daily-visit',
  'overnight',
  'boarding',
  'walking',
]);

export type RequestActionPayload =
  | {
      action: 'create-request';
      actorId?: string;
      data?: unknown;
    }
  | {
      action: 'update-request';
      actorId?: string;
      ownerId?: string;
      requestId?: string;
      data?: unknown;
    }
  | {
      action:
        | 'cancel-request'
        | 'delete-request'
        | 'mark-awaiting-confirmation'
        | 'confirm-completion'
        | 'cancel-accepted-request'
        | 'accept-direct-request'
        | 'withdraw-application';
      actorId?: string;
      ownerId?: string;
      requestId?: string;
    }
  | {
      action: 'apply-to-request';
      actorId?: string;
      ownerId?: string;
      requestId?: string;
      message?: unknown;
    }
  | {
      action: 'accept-application';
      actorId?: string;
      ownerId?: string;
      requestId?: string;
      sitterId?: string;
    }
  | {
      action: 'submit-review';
      actorId?: string;
      ownerId?: string;
      requestId?: string;
      rating?: unknown;
      comment?: unknown;
    };

function generateId(): string {
  return crypto.randomUUID();
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${label} is required`);
  }

  return value.trim();
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} is required`);
  }

  return value as Record<string, unknown>;
}

function requireDate(value: unknown, label: string): Date {
  const date =
    value instanceof Date
      ? value
      : typeof value === 'string' || typeof value === 'number'
        ? new Date(value)
        : null;

  if (!date || Number.isNaN(date.getTime())) {
    throw new Error(`${label} is invalid`);
  }

  return date;
}

function optionalDate(value: unknown, label: string): Date | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  return requireDate(value, label);
}

function requireStringArray(value: unknown, label: string): string[] {
  if (!Array.isArray(value)) {
    throw new Error(`${label} is required`);
  }

  const values = value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  if (values.length !== value.length) {
    throw new Error(`${label} contains invalid values`);
  }

  return values;
}

function parseCareType(value: unknown): Request['careType'] {
  if (typeof value === 'string' && CARE_TYPES.has(value as Request['careType'])) {
    return value as Request['careType'];
  }

  throw new Error('Care type is invalid');
}

function parseAudience(value: unknown): RequestAudience {
  return value === 'direct' ? 'direct' : 'community';
}

function calculateCreditsForRequestWindow(startDate: Date, endDate: Date): number {
  const durationMs = endDate.getTime() - startDate.getTime();

  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    throw new Error('End date must be after start date');
  }

  return Math.max(1, Math.ceil(durationMs / MILLISECONDS_PER_HOUR));
}

function validateRequestTextFields(data: {
  notes?: string;
  feedingSchedule?: string;
  walkSchedule?: string;
  medicationInstructions?: string;
  sleepInstructions?: string;
  specialWarnings?: string;
}) {
  assertNoMoneyLanguage(
    data.notes,
    data.feedingSchedule,
    data.walkSchedule,
    data.medicationInstructions,
    data.sleepInstructions,
    data.specialWarnings
  );
}

function parseCreateRequestData(value: unknown): CreateRequestData {
  const data = requireRecord(value, 'Request data');
  const startDate = requireDate(data.startDate, 'Start date');
  const endDate = requireDate(data.endDate, 'End date');

  return {
    petIds: requireStringArray(data.petIds, 'Pet ids'),
    careType: parseCareType(data.careType),
    startDate,
    endDate,
    location: requireString(data.location, 'Location'),
    locationLat: typeof data.locationLat === 'number' ? data.locationLat : undefined,
    locationLng: typeof data.locationLng === 'number' ? data.locationLng : undefined,
    creditsOffered: calculateCreditsForRequestWindow(startDate, endDate),
    audience: parseAudience(data.audience),
    requestedSitterId: asOptionalString(data.requestedSitterId),
    requestedSitterName: asOptionalString(data.requestedSitterName),
    notes: asOptionalString(data.notes),
    feedingSchedule: asOptionalString(data.feedingSchedule),
    walkSchedule: asOptionalString(data.walkSchedule),
    medicationInstructions: asOptionalString(data.medicationInstructions),
    sleepInstructions: asOptionalString(data.sleepInstructions),
    specialWarnings: asOptionalString(data.specialWarnings),
  };
}

function parseUpdateRequestData(value: unknown): UpdateRequestData {
  const data = requireRecord(value, 'Request update data');
  const update: UpdateRequestData = {};

  if ('petIds' in data) update.petIds = requireStringArray(data.petIds, 'Pet ids');
  if ('careType' in data) update.careType = parseCareType(data.careType);
  if ('startDate' in data) update.startDate = optionalDate(data.startDate, 'Start date');
  if ('endDate' in data) update.endDate = optionalDate(data.endDate, 'End date');
  if ('location' in data) update.location = requireString(data.location, 'Location');
  if ('locationLat' in data && typeof data.locationLat === 'number') update.locationLat = data.locationLat;
  if ('locationLng' in data && typeof data.locationLng === 'number') update.locationLng = data.locationLng;
  if ('audience' in data) update.audience = parseAudience(data.audience);
  if ('requestedSitterId' in data) update.requestedSitterId = asOptionalString(data.requestedSitterId);
  if ('requestedSitterName' in data) update.requestedSitterName = asOptionalString(data.requestedSitterName);
  if ('notes' in data) update.notes = asOptionalString(data.notes) ?? '';
  if ('feedingSchedule' in data) update.feedingSchedule = asOptionalString(data.feedingSchedule) ?? '';
  if ('walkSchedule' in data) update.walkSchedule = asOptionalString(data.walkSchedule) ?? '';
  if ('medicationInstructions' in data) {
    update.medicationInstructions = asOptionalString(data.medicationInstructions) ?? '';
  }
  if ('sleepInstructions' in data) update.sleepInstructions = asOptionalString(data.sleepInstructions) ?? '';
  if ('specialWarnings' in data) update.specialWarnings = asOptionalString(data.specialWarnings) ?? '';

  return update;
}

async function assertActiveActor(actorId: string) {
  const profile = await getProfileFromSupabase(actorId);
  if (!profile) {
    throw new Error('Actor profile not found');
  }
  if (profile.frozen) {
    throw new Error('Account is paused');
  }

  return profile;
}

async function requireOwnedRequest(ownerId: string, requestId: string): Promise<Request> {
  const request = await getRequestByIdFromSupabase(ownerId, requestId);
  if (!request) {
    throw new Error('Request not found');
  }

  return request;
}

async function resolveRequestedSitter(params: {
  ownerId: string;
  audience: RequestAudience;
  requestedSitterId?: string;
}): Promise<{ requestedSitterId?: string; requestedSitterName?: string }> {
  if (params.audience !== 'direct') {
    return {};
  }

  const requestedSitterId = params.requestedSitterId?.trim() || '';
  if (!requestedSitterId) {
    throw new Error('A direct request must include a sitter.');
  }
  if (requestedSitterId === params.ownerId) {
    throw new Error('You cannot send a direct request to yourself.');
  }

  const requestedSitterProfile = await getPublicProfileFromSupabase(requestedSitterId);
  if (!requestedSitterProfile) {
    throw new Error('Requested sitter profile not found.');
  }

  return {
    requestedSitterId,
    requestedSitterName: requestedSitterProfile.name,
  };
}

async function assertPetsBelongToOwner(ownerId: string, petIds: string[]) {
  if (petIds.length === 0) {
    throw new Error('At least one pet must be selected');
  }

  const userPets = await getOwnerPetsFromSupabase(ownerId);
  const validPetIds = new Set(userPets.map((pet) => pet.id));
  const invalidPets = petIds.filter((petId) => !validPetIds.has(petId));
  if (invalidPets.length > 0) {
    throw new Error('You can only create requests for your own pets');
  }

  return userPets.filter((pet) => petIds.includes(pet.id));
}

async function getAvailabilityMatch(sitterId: string, startDate: Date, endDate: Date) {
  if (endDate.getTime() <= startDate.getTime()) {
    throw new Error('End date must be after start date');
  }

  const slots = await getAvailabilitySlotsFromSupabase(sitterId);
  const matchingSlots = slots.filter(
    (slot) =>
      slot.endAt.getTime() >= Date.now() &&
      slot.startAt.getTime() <= startDate.getTime() &&
      slot.endAt.getTime() >= endDate.getTime()
  );

  if (matchingSlots.length === 0) {
    return { available: false, hasConflict: false };
  }

  const hasConflict = await hasActiveRequestConflictFromSupabase(sitterId, startDate, endDate);
  return { available: !hasConflict, hasConflict };
}

function buildConversationId(requestId: string, ownerId: string, sitterId: string): string {
  return `${requestId}_${ownerId}_${sitterId}`;
}

async function ensureConversation(request: Request, sitterId: string, sitterName?: string): Promise<void> {
  const now = new Date();
  await upsertConversationInSupabase({
    conversationId: buildConversationId(request.id, request.ownerId, sitterId),
    ownerId: request.ownerId,
    requestId: request.id,
    sitterId,
    ownerName: request.ownerName || 'Owner',
    sitterName: sitterName || request.sitterName || request.requestedSitterName || 'Sitter',
    title: request.petNames.length > 0 ? request.petNames.join(', ') : 'Pet request',
    subtitle: request.location,
    status: request.status,
    participants: [request.ownerId, sitterId],
    lastMessage: '',
    lastMessageAt: null,
    createdAt: request.createdAt,
    updatedAt: now,
  });
}

async function createNotification(params: {
  userId: string;
  type: Parameters<typeof upsertNotificationInSupabase>[0]['type'];
  relatedRequestId?: string;
  message: string;
}) {
  await upsertNotificationInSupabase({
    id: generateId(),
    userId: params.userId,
    type: params.type,
    relatedRequestId: params.relatedRequestId,
    message: params.message,
    read: false,
    createdAt: new Date(),
  });
}

function buildTransaction(params: {
  type: Transaction['type'];
  amount: number;
  requestId?: string;
  reference: string;
  balanceAfter: number;
}): Transaction {
  return {
    id: generateId(),
    type: params.type,
    amount: params.amount,
    requestId: params.requestId,
    reference: params.reference,
    balanceAfter: params.balanceAfter,
    timestamp: new Date(),
  };
}

async function applyWalletActionForRequest(params: {
  actorId: string;
  userId: string;
  request: Request;
  action: NonNullable<Wallet['lastWalletAction']>;
}) {
  const currentWallet = await getWalletFromSupabase(params.userId);
  if (!currentWallet) {
    throw new Error('Wallet not found. Please initialize wallet first.');
  }

  const transactions = await getWalletTransactionsFromSupabase(params.userId);
  const request = params.request;
  const actionConfig =
    params.action === 'escrow_hold'
      ? {
          transactionType: 'escrow' as const,
          allowed:
            params.userId === request.ownerId &&
            request.status === 'accepted' &&
            request.escrowStatus === 'held' &&
            (params.actorId === request.ownerId || params.actorId === request.sitterId),
          balanceDelta: -request.creditsOffered,
          reference: `Escrow for request ${request.id}`,
        }
      : params.action === 'escrow_release'
        ? {
            transactionType: 'escrow-release' as const,
            allowed:
              params.userId === request.sitterId &&
              params.actorId === request.ownerId &&
              request.status === 'completed' &&
              request.escrowStatus === 'released',
            balanceDelta: request.creditsOffered,
            reference: `Reward completed for request ${request.id}`,
          }
        : params.action === 'escrow_refund'
          ? {
              transactionType: 'escrow-refund' as const,
              allowed:
                params.userId === request.ownerId &&
                request.status === 'cancelled' &&
                request.escrowStatus === 'refunded' &&
                (params.actorId === request.ownerId || params.actorId === request.sitterId),
              balanceDelta: request.creditsOffered,
              reference: `Refund for cancelled request ${request.id}`,
            }
          : null;

  if (!actionConfig?.allowed || request.creditsOffered <= 0) {
    throw new Error('Invalid wallet operation for request state');
  }

  if (
    transactions.some(
      (transaction) =>
        transaction.requestId === request.id && transaction.type === actionConfig.transactionType
    )
  ) {
    return;
  }

  const nextBalance = currentWallet.balance + actionConfig.balanceDelta;
  if (nextBalance < 0) {
    throw new Error('Insufficient credits');
  }

  const now = new Date();
  await replaceWalletStateInSupabase({
    userId: params.userId,
    wallet: {
      ...currentWallet,
      balance: nextBalance,
      lastRequestId: request.id,
      lastRequestOwnerId:
        params.action === 'escrow_release' ? '' : request.ownerId,
      dailyEarnedCredits:
        params.action === 'escrow_release'
          ? (currentWallet.dailyEarnedCredits ?? 0) + request.creditsOffered
          : currentWallet.dailyEarnedCredits,
      dailyEarnedDate:
        params.action === 'escrow_release'
          ? getTodayKey(now)
          : currentWallet.dailyEarnedDate,
      lastWalletAction: params.action,
      updatedAt: now,
    },
    transactions: [
      buildTransaction({
        type: actionConfig.transactionType,
        amount: request.creditsOffered,
        requestId: request.id,
        reference: actionConfig.reference,
        balanceAfter: nextBalance,
      }),
      ...transactions,
    ],
  });
}

async function updateSitterProfileMetrics(sitterId: string, refreshRatings: boolean) {
  const sitterProfile = await getProfileFromSupabase(sitterId);
  if (!sitterProfile) {
    return;
  }

  let ratingAverage = sitterProfile.ratingAverage;
  let ratingCount = sitterProfile.ratingCount;
  if (refreshRatings) {
    const sitterRequests = await getSitterRequestsFromSupabase(sitterId);
    const ratings = sitterRequests
      .filter((entry) => entry.status === 'completed')
      .map((entry) => entry.ownerReview ?? entry.review)
      .filter((review): review is RequestReview => Boolean(review))
      .map((review) => review.rating)
      .filter((rating) => Number.isFinite(rating) && rating >= 1 && rating <= 5);

    ratingCount = ratings.length;
    ratingAverage =
      ratings.length > 0 ? ratings.reduce((total, rating) => total + rating, 0) / ratings.length : 0;
  }

  const completedSits = await getCompletedSitsCountFromSupabase(sitterId);
  const trustScore = calculateTrustScore(
    {
      ...sitterProfile,
      ratingAverage,
      ratingCount,
    },
    completedSits
  );

  const updates = {
    rating_average: ratingAverage,
    rating_count: ratingCount,
    trust_score: trustScore,
    updated_at: new Date().toISOString(),
  };
  const supabase = createSupabaseAdminClient();
  const { error: profileError } = await supabase
    .from('profiles')
    .update(updates)
    .eq('uid', sitterId);
  if (profileError) {
    throw new Error(profileError.message);
  }

  const { error: publicProfileError } = await supabase
    .from('public_profiles')
    .update(updates)
    .eq('uid', sitterId);
  if (publicProfileError) {
    throw new Error(publicProfileError.message);
  }
}

async function logRepeatedPairActivity(ownerId: string, sitterId: string, requestId: string) {
  const ownerRequests = await getUserRequestsFromSupabase(ownerId);
  const repeatedCount = ownerRequests.filter(
    (request) => request.sitterId === sitterId && request.status === 'completed'
  ).length;

  if (repeatedCount < REPEATED_PAIR_ACTIVITY_THRESHOLD) {
    return;
  }

  await upsertReportInSupabase({
    id: generateId(),
    reporterId: ownerId,
    type: 'suspicious',
    targetUserId: sitterId,
    targetOwnerId: ownerId,
    targetRequestId: requestId,
    reason: `Repeated completed exchanges detected between the same owner and sitter (${repeatedCount} total).`,
    status: 'open',
    createdAt: new Date(),
  });
}

async function createRequestAction(actorId: string, payload: Extract<RequestActionPayload, { action: 'create-request' }>) {
  const ownerProfile = await assertActiveActor(actorId);
  const data = parseCreateRequestData(payload.data);
  validateRequestTextFields(data);

  const selectedPets = await assertPetsBelongToOwner(actorId, data.petIds);
  const audience = data.audience === 'direct' ? 'direct' : 'community';
  const requestedSitter = await resolveRequestedSitter({
    ownerId: actorId,
    audience,
    requestedSitterId: data.requestedSitterId,
  });
  const selectedLocation = getCityLocationPayload(data.location || ownerProfile.location);
  if (!selectedLocation) {
    throw new Error('Select a supported Finnish city');
  }

  const requestId = generateId();
  const now = new Date();
  const request: Request = {
    id: requestId,
    ownerId: actorId,
    ownerName: ownerProfile.name,
    petIds: data.petIds,
    petNames: selectedPets.map((pet) => pet.name),
    careType: data.careType,
    startDate: data.startDate,
    endDate: data.endDate,
    location: selectedLocation.location,
    locationLat: selectedLocation.latitude,
    locationLng: selectedLocation.longitude,
    creditsOffered: calculateCreditsForRequestWindow(data.startDate, data.endDate),
    status: 'open',
    audience,
    escrowStatus: 'none',
    requestedSitterId: requestedSitter.requestedSitterId,
    requestedSitterName: requestedSitter.requestedSitterName,
    applications: [],
    notes: data.notes || '',
    feedingSchedule: data.feedingSchedule || '',
    walkSchedule: data.walkSchedule || '',
    medicationInstructions: data.medicationInstructions || '',
    sleepInstructions: data.sleepInstructions || '',
    specialWarnings: data.specialWarnings || '',
    createdAt: now,
    updatedAt: now,
  };

  await upsertRequestInSupabase(request);

  if (audience === 'direct' && requestedSitter.requestedSitterId) {
    await createNotification({
      userId: requestedSitter.requestedSitterId,
      type: 'direct_request_received',
      relatedRequestId: requestId,
      message: `${ownerProfile.name} sent you a direct request for ${request.petNames.join(', ')}.`,
    });
  }

  return { requestId };
}

async function updateRequestAction(actorId: string, payload: Extract<RequestActionPayload, { action: 'update-request' }>) {
  await assertActiveActor(actorId);
  const ownerId = requireString(payload.ownerId, 'Owner id');
  const requestId = requireString(payload.requestId, 'Request id');
  if (ownerId !== actorId) {
    throw new Error('Only the request owner can edit it');
  }

  const data = parseUpdateRequestData(payload.data);
  validateRequestTextFields(data);
  const request = await requireOwnedRequest(ownerId, requestId);
  if (request.status !== 'open') {
    throw new Error('Can only edit open requests');
  }

  let petIds = request.petIds;
  let petNames = request.petNames;
  if (data.petIds) {
    const selectedPets = await assertPetsBelongToOwner(ownerId, data.petIds);
    petIds = data.petIds;
    petNames = selectedPets.map((pet) => pet.name);
  }

  const effectiveStartDate = data.startDate ?? request.startDate;
  const effectiveEndDate = data.endDate ?? request.endDate;
  const audience = data.audience ?? request.audience;
  const requestedSitter = await resolveRequestedSitter({
    ownerId,
    audience,
    requestedSitterId: data.requestedSitterId ?? request.requestedSitterId,
  });
  const selectedLocation = getCityLocationPayload(data.location ?? request.location);
  if (!selectedLocation) {
    throw new Error('Select a supported Finnish city');
  }

  await upsertRequestInSupabase({
    ...request,
    petIds,
    petNames,
    careType: data.careType ?? request.careType,
    startDate: effectiveStartDate,
    endDate: effectiveEndDate,
    location: selectedLocation.location,
    locationLat: selectedLocation.latitude,
    locationLng: selectedLocation.longitude,
    creditsOffered: calculateCreditsForRequestWindow(effectiveStartDate, effectiveEndDate),
    audience,
    requestedSitterId: requestedSitter.requestedSitterId,
    requestedSitterName: requestedSitter.requestedSitterName,
    notes: data.notes ?? request.notes ?? '',
    feedingSchedule: data.feedingSchedule ?? request.feedingSchedule ?? '',
    walkSchedule: data.walkSchedule ?? request.walkSchedule ?? '',
    medicationInstructions: data.medicationInstructions ?? request.medicationInstructions ?? '',
    sleepInstructions: data.sleepInstructions ?? request.sleepInstructions ?? '',
    specialWarnings: data.specialWarnings ?? request.specialWarnings ?? '',
    updatedAt: new Date(),
  });
}

async function cancelRequestAction(actorId: string, ownerId: string, requestId: string) {
  await assertActiveActor(actorId);
  if (ownerId !== actorId) {
    throw new Error('Only the request owner can cancel it');
  }

  const request = await requireOwnedRequest(ownerId, requestId);
  if (request.status === 'accepted') {
    throw new Error('Use cancelAcceptedRequest to cancel an accepted request (requires escrow refund)');
  }
  if (request.status !== 'open') {
    throw new Error(`Cannot cancel request with status: ${request.status}`);
  }

  await upsertRequestInSupabase({
    ...request,
    status: 'cancelled',
    updatedAt: new Date(),
  });
}

async function deleteRequestAction(actorId: string, ownerId: string, requestId: string) {
  await assertActiveActor(actorId);
  if (ownerId !== actorId) {
    throw new Error('Only the request owner can delete it');
  }

  const request = await requireOwnedRequest(ownerId, requestId);
  if (
    request.status !== 'open' &&
    request.status !== 'cancelled' &&
    request.status !== 'accepted' &&
    request.status !== 'awaiting_confirmation'
  ) {
    throw new Error('Can only delete open, cancelled, or active requests');
  }

  if (request.status === 'accepted' || request.status === 'awaiting_confirmation') {
    if (request.escrowStatus !== 'held') {
      throw new Error('Escrow status mismatch: expected held before refund');
    }
    if (!request.sitterId) {
      throw new Error('No sitter assigned to this request');
    }

    const cancelledRequest: Request = {
      ...request,
      status: 'cancelled',
      escrowStatus: 'refunded',
      updatedAt: new Date(),
    };

    await upsertRequestInSupabase(cancelledRequest);
    try {
      await applyWalletActionForRequest({
        actorId,
        userId: ownerId,
        request: cancelledRequest,
        action: 'escrow_refund',
      });
    } catch (error) {
      await upsertRequestInSupabase(request).catch(() => undefined);
      throw error;
    }
  }

  await deleteRequestInSupabase(ownerId, requestId);
  await Promise.all([
    deleteNotificationsForRequestFromSupabase(requestId),
    deleteConversationsForRequestFromSupabase(requestId),
  ]);
}

async function applyToRequestAction(actorId: string, payload: Extract<RequestActionPayload, { action: 'apply-to-request' }>) {
  const sitterProfile = await assertActiveActor(actorId);
  const ownerId = requireString(payload.ownerId, 'Owner id');
  const requestId = requireString(payload.requestId, 'Request id');
  const message = asOptionalString(payload.message) ?? '';
  assertNoMoneyLanguage(message);

  if (ownerId === actorId) {
    throw new Error('You cannot apply to your own request');
  }
  if (sitterProfile.availability !== 'available') {
    throw new Error('Set your availability to Available before applying');
  }

  const request = await requireOwnedRequest(ownerId, requestId);
  if (request.status !== 'open') {
    throw new Error('This request is no longer open');
  }
  if (request.audience === 'direct' && request.requestedSitterId && request.requestedSitterId !== actorId) {
    throw new Error('This direct request was sent to another sitter.');
  }

  const availabilityMatch = await getAvailabilityMatch(actorId, request.startDate, request.endDate);
  if (!availabilityMatch.available) {
    if (availabilityMatch.hasConflict) {
      throw new Error('You already have another confirmed booking during these dates');
    }
    throw new Error('Add an availability slot that fully covers these dates before applying');
  }

  if ((request.applications ?? []).some((application) => application.sitterId === actorId)) {
    throw new Error('You have already applied to this request');
  }

  const updatedRequest: Request = {
    ...request,
    applications: [
      ...(request.applications ?? []),
      {
        sitterId: actorId,
        sitterName: sitterProfile.name,
        message,
        appliedAt: new Date(),
      },
    ],
    updatedAt: new Date(),
  };

  await upsertRequestInSupabase(updatedRequest);
  await ensureConversation(updatedRequest, actorId, sitterProfile.name);
  await createNotification({
    userId: ownerId,
    type: 'application_received',
    relatedRequestId: requestId,
    message: `${sitterProfile.name} applied to your request.`,
  });
}

async function withdrawApplicationAction(actorId: string, ownerId: string, requestId: string) {
  await assertActiveActor(actorId);
  const request = await requireOwnedRequest(ownerId, requestId);
  if (request.status !== 'open') {
    throw new Error('Cannot withdraw application after request is no longer open');
  }

  const nextApplications = (request.applications ?? []).filter(
    (application) => application.sitterId !== actorId
  );
  if (nextApplications.length === (request.applications ?? []).length) {
    throw new Error('Application not found');
  }

  await upsertRequestInSupabase({
    ...request,
    applications: nextApplications,
    updatedAt: new Date(),
  });
}

async function acceptApplicationAction(actorId: string, payload: Extract<RequestActionPayload, { action: 'accept-application' }>) {
  await assertActiveActor(actorId);
  const ownerId = requireString(payload.ownerId, 'Owner id');
  const requestId = requireString(payload.requestId, 'Request id');
  const sitterId = requireString(payload.sitterId, 'Sitter id');
  if (ownerId !== actorId) {
    throw new Error('Only the request owner can accept applications');
  }

  const request = await requireOwnedRequest(ownerId, requestId);
  if (request.status !== 'open') {
    throw new Error('Request is no longer open');
  }

  const selectedApplication = (request.applications ?? []).find(
    (application) => application.sitterId === sitterId
  );
  if (!selectedApplication) {
    throw new Error('Selected sitter has not applied');
  }

  const availabilityMatch = await getAvailabilityMatch(sitterId, request.startDate, request.endDate);
  if (!availabilityMatch.available) {
    if (availabilityMatch.hasConflict) {
      throw new Error('This sitter already has another confirmed booking during these dates');
    }
    throw new Error('This sitter no longer has an availability slot covering these dates');
  }

  const acceptedRequest: Request = {
    ...request,
    status: 'accepted',
    escrowStatus: 'held',
    sitterId,
    sitterName: selectedApplication.sitterName,
    applications: [],
    updatedAt: new Date(),
  };

  await upsertRequestInSupabase(acceptedRequest);
  try {
    await applyWalletActionForRequest({
      actorId,
      userId: ownerId,
      request: acceptedRequest,
      action: 'escrow_hold',
    });
  } catch (error) {
    await upsertRequestInSupabase(request).catch(() => undefined);
    throw error;
  }

  await ensureConversation(acceptedRequest, sitterId, selectedApplication.sitterName);
  await createNotification({
    userId: sitterId,
    type: 'application_accepted',
    relatedRequestId: requestId,
    message: `Your application was accepted by ${request.ownerName || 'Owner'}.`,
  });
}

async function acceptDirectRequestAction(actorId: string, ownerId: string, requestId: string) {
  const sitterProfile = await assertActiveActor(actorId);
  if (ownerId === actorId) {
    throw new Error('You cannot accept your own request');
  }

  const request = await requireOwnedRequest(ownerId, requestId);
  if (request.audience !== 'direct' || request.requestedSitterId !== actorId) {
    throw new Error('This direct request was sent to another sitter.');
  }
  if (request.status !== 'open') {
    throw new Error('Request is no longer open');
  }

  const hasConflict = await hasActiveRequestConflictFromSupabase(
    actorId,
    request.startDate,
    request.endDate
  );
  if (hasConflict) {
    throw new Error('You already have another confirmed booking during these dates');
  }

  const acceptedRequest: Request = {
    ...request,
    status: 'accepted',
    escrowStatus: 'held',
    sitterId: actorId,
    sitterName: sitterProfile.name,
    applications: [],
    updatedAt: new Date(),
  };

  await upsertRequestInSupabase(acceptedRequest);
  try {
    await applyWalletActionForRequest({
      actorId,
      userId: ownerId,
      request: acceptedRequest,
      action: 'escrow_hold',
    });
  } catch (error) {
    await upsertRequestInSupabase(request).catch(() => undefined);
    throw error;
  }

  await ensureConversation(acceptedRequest, actorId, sitterProfile.name);
}

async function markAwaitingConfirmationAction(actorId: string, ownerId: string, requestId: string) {
  await assertActiveActor(actorId);
  const request = await requireOwnedRequest(ownerId, requestId);

  if (request.status !== 'accepted') {
    throw new Error(`Cannot mark request with status ${request.status} as awaiting confirmation`);
  }
  if (request.escrowStatus !== 'held') {
    throw new Error('Escrow must be held before moving to awaiting confirmation');
  }
  if (request.sitterId !== actorId) {
    throw new Error('Only the assigned sitter can mark this request as awaiting confirmation');
  }

  await upsertRequestInSupabase({
    ...request,
    status: 'awaiting_confirmation',
    markedCompleteAt: new Date(),
    updatedAt: new Date(),
  });

  await createNotification({
    userId: ownerId,
    type: 'request_completed',
    relatedRequestId: requestId,
    message: 'The sitter marked this task as complete. Please confirm to release credits.',
  });
}

async function confirmCompletionAction(actorId: string, ownerId: string, requestId: string) {
  await assertActiveActor(actorId);
  if (actorId !== ownerId) {
    throw new Error('Only the request owner can confirm completion');
  }

  const request = await requireOwnedRequest(ownerId, requestId);
  const sitterId = request.sitterId;
  if (request.status !== 'awaiting_confirmation') {
    throw new Error(`Cannot confirm completion for request with status: ${request.status}`);
  }
  if (request.escrowStatus !== 'held') {
    throw new Error('Escrow status mismatch: expected held before completion');
  }
  if (!sitterId) {
    throw new Error('No sitter assigned to this request');
  }

  const completedRequest: Request = {
    ...request,
    status: 'completed',
    escrowStatus: 'released',
    confirmedCompleteAt: new Date(),
    updatedAt: new Date(),
  };

  await upsertRequestInSupabase(completedRequest);
  try {
    await applyWalletActionForRequest({
      actorId,
      userId: sitterId,
      request: completedRequest,
      action: 'escrow_release',
    });
  } catch (error) {
    await upsertRequestInSupabase(request).catch(() => undefined);
    throw error;
  }

  await createNotification({
    userId: ownerId,
    type: 'request_completed',
    relatedRequestId: requestId,
    message: 'Request marked as completed.',
  });
  await createNotification({
    userId: sitterId,
    type: 'request_completed',
    relatedRequestId: requestId,
    message: 'Reward completed. Credits have been released.',
  });
  await updateSitterProfileMetrics(sitterId, false);
  await logRepeatedPairActivity(ownerId, sitterId, requestId);
}

async function cancelAcceptedRequestAction(actorId: string, ownerId: string, requestId: string) {
  await assertActiveActor(actorId);
  const request = await requireOwnedRequest(ownerId, requestId);

  if (request.status !== 'accepted' && request.status !== 'awaiting_confirmation') {
    throw new Error(
      `Cannot cancel request with status: ${request.status}. Use cancelRequest for open requests.`
    );
  }
  if (request.escrowStatus !== 'held') {
    throw new Error('Escrow status mismatch: expected held before refund');
  }
  if (!request.sitterId) {
    throw new Error('No sitter assigned to this request');
  }
  if (actorId !== ownerId && actorId !== request.sitterId) {
    throw new Error('Only owner or assigned sitter can cancel the request');
  }

  const cancelledRequest: Request = {
    ...request,
    status: 'cancelled',
    escrowStatus: 'refunded',
    updatedAt: new Date(),
  };

  await upsertRequestInSupabase(cancelledRequest);
  try {
    await applyWalletActionForRequest({
      actorId,
      userId: ownerId,
      request: cancelledRequest,
      action: 'escrow_refund',
    });
  } catch (error) {
    await upsertRequestInSupabase(request).catch(() => undefined);
    throw error;
  }
}

async function submitReviewAction(actorId: string, payload: Extract<RequestActionPayload, { action: 'submit-review' }>) {
  await assertActiveActor(actorId);
  const ownerId = requireString(payload.ownerId, 'Owner id');
  const requestId = requireString(payload.requestId, 'Request id');
  const rating = typeof payload.rating === 'number' ? payload.rating : Number(payload.rating);
  const comment = asOptionalString(payload.comment)?.trim() ?? '';
  if (actorId !== ownerId) {
    throw new Error('Only the request owner can review');
  }
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    throw new Error('Rating must be between 1 and 5');
  }

  const request = await requireOwnedRequest(ownerId, requestId);
  const sitterId = request.sitterId;
  if (request.status !== 'completed') {
    throw new Error('You can review only completed requests');
  }
  if (!sitterId) {
    throw new Error('No sitter assigned for this request');
  }
  if (request.review || request.ownerReview) {
    throw new Error('This request already has a review');
  }

  const publicSitterProfile = await getPublicProfileFromSupabase(sitterId);
  if (!publicSitterProfile) {
    throw new Error('Sitter public profile not found');
  }

  const review: RequestReview = {
    rating,
    comment,
    reviewerId: ownerId,
    reviewerName: request.ownerName || 'Owner',
    reviewedAt: new Date(),
  };

  await upsertRequestInSupabase({
    ...request,
    review,
    ownerReview: review,
    updatedAt: new Date(),
  });
  await createNotification({
    userId: sitterId,
    type: 'review_received',
    relatedRequestId: requestId,
    message: 'You received a new review.',
  });
  await updateSitterProfileMetrics(sitterId, true);
}

export async function performRequestAction(actorId: string, payload: RequestActionPayload) {
  switch (payload.action) {
    case 'create-request':
      return createRequestAction(actorId, payload);
    case 'update-request':
      await updateRequestAction(actorId, payload);
      return {};
    case 'cancel-request':
      await cancelRequestAction(
        actorId,
        requireString(payload.ownerId, 'Owner id'),
        requireString(payload.requestId, 'Request id')
      );
      return {};
    case 'delete-request':
      await deleteRequestAction(
        actorId,
        requireString(payload.ownerId, 'Owner id'),
        requireString(payload.requestId, 'Request id')
      );
      return {};
    case 'apply-to-request':
      await applyToRequestAction(actorId, payload);
      return {};
    case 'withdraw-application':
      await withdrawApplicationAction(
        actorId,
        requireString(payload.ownerId, 'Owner id'),
        requireString(payload.requestId, 'Request id')
      );
      return {};
    case 'accept-application':
      await acceptApplicationAction(actorId, payload);
      return {};
    case 'accept-direct-request':
      await acceptDirectRequestAction(
        actorId,
        requireString(payload.ownerId, 'Owner id'),
        requireString(payload.requestId, 'Request id')
      );
      return {};
    case 'mark-awaiting-confirmation':
      await markAwaitingConfirmationAction(
        actorId,
        requireString(payload.ownerId, 'Owner id'),
        requireString(payload.requestId, 'Request id')
      );
      return {};
    case 'confirm-completion':
      await confirmCompletionAction(
        actorId,
        requireString(payload.ownerId, 'Owner id'),
        requireString(payload.requestId, 'Request id')
      );
      return {};
    case 'cancel-accepted-request':
      await cancelAcceptedRequestAction(
        actorId,
        requireString(payload.ownerId, 'Owner id'),
        requireString(payload.requestId, 'Request id')
      );
      return {};
    case 'submit-review':
      await submitReviewAction(actorId, payload);
      return {};
    default:
      throw new Error('Unsupported request action');
  }
}
