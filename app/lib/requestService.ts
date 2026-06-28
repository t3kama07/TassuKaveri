import { getAvailabilityMatch } from './availabilityService';
import {
  CreateRequestData,
  Request,
  RequestApplication,
  RequestAudience,
  RequestReview,
  RequestStatus,
  UpdateRequestData,
} from '@/types/request';
import { getUserPets } from './petService';
import { getProfile } from './profileService';
import { getPublicProfile } from './publicProfileService';
import { logRepeatedPairActivity } from './moderationService';
import { createNotification } from './notificationService';
import { ensureConversation } from './messageService';
import {
  deleteRequestFromSupabase,
  mirrorRequestToSupabase,
  syncProfileMetricsToSupabase,
} from './supabaseMirrorClient';
import { fetchSupabaseReadJson } from './supabaseReadClient';
import { getCurrentAuthUser } from './supabaseAuthClient';
import { escrowCredits, refundEscrow, releaseEscrow } from './walletService';
import { getCityLocationPayload } from './locations';
import { assertNoMoneyLanguage } from './platformPolicy';

const MILLISECONDS_PER_HOUR = 60 * 60 * 1000;

function generateRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function toDateOrNow(value: unknown): Date {
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }
  if (
    value &&
    typeof value === 'object' &&
    'toDate' in value &&
    typeof value.toDate === 'function'
  ) {
    return value.toDate();
  }
  return new Date();
}

function toOptionalDate(value: unknown): Date | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  return toDateOrNow(value);
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function resolveAudience(data: Record<string, unknown>): RequestAudience {
  return data.audience === 'direct' ? 'direct' : 'community';
}

export function calculateCreditsForRequestWindow(startDate: Date, endDate: Date): number {
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

function parseApplications(raw: unknown): RequestApplication[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const applications: RequestApplication[] = [];

  raw.forEach((item) => {
    if (!item || typeof item !== 'object') {
      return;
    }

    const application = item as Record<string, unknown>;
    const sitterId = typeof application.sitterId === 'string' ? application.sitterId : '';
    const sitterName = typeof application.sitterName === 'string' ? application.sitterName : '';
    const message = typeof application.message === 'string' ? application.message : '';

    if (!sitterId || !sitterName) {
      return;
    }

    applications.push({
      sitterId,
      sitterName,
      message,
      appliedAt: toDateOrNow(application.appliedAt),
    });
  });

  return applications;
}

function parseReview(raw: unknown): RequestReview | undefined {
  if (!raw || typeof raw !== 'object') {
    return undefined;
  }

  const review = raw as Record<string, unknown>;
  const rating = asNumber(review.rating);
  const reviewerId = typeof review.reviewerId === 'string' ? review.reviewerId : '';
  const reviewerName = typeof review.reviewerName === 'string' ? review.reviewerName : '';
  const comment = typeof review.comment === 'string' ? review.comment : '';

  if (!rating || !reviewerId || !reviewerName) {
    return undefined;
  }

  return {
    rating,
    comment,
    reviewerId,
    reviewerName,
    reviewedAt: toDateOrNow(review.reviewedAt),
  };
}

function mapRequest(id: string, data: Record<string, unknown>): Request {
  const ownerReview = parseReview(data.ownerReview ?? data.review);
  const sitterReview = parseReview(data.sitterReview);

  return {
    id,
    ownerId: (data.ownerId as string) || '',
    ownerName: (data.ownerName as string) || '',
    petIds: Array.isArray(data.petIds) ? (data.petIds as string[]) : [],
    petNames: Array.isArray(data.petNames) ? (data.petNames as string[]) : [],
    careType: (data.careType as Request['careType']) || 'daily-visit',
    startDate: toDateOrNow(data.startDate),
    endDate: toDateOrNow(data.endDate),
    location: (data.location as string) || '',
    locationLat: asNumber(data.locationLat),
    locationLng: asNumber(data.locationLng),
    creditsOffered: asNumber(data.creditsOffered) || 0,
    status: (data.status as RequestStatus) || 'open',
    audience: resolveAudience(data),
    escrowStatus: (data.escrowStatus as Request['escrowStatus']) || 'none',
    sitterId: (data.sitterId as string) || undefined,
    sitterName: (data.sitterName as string) || undefined,
    requestedSitterId: (data.requestedSitterId as string) || undefined,
    requestedSitterName: (data.requestedSitterName as string) || undefined,
    applications: parseApplications(data.applications),
    review: ownerReview,
    ownerReview,
    sitterReview,
    markedCompleteAt: toOptionalDate(data.markedCompleteAt),
    confirmedCompleteAt: toOptionalDate(data.confirmedCompleteAt),
    notes: (data.notes as string) || '',
    feedingSchedule: (data.feedingSchedule as string) || '',
    walkSchedule: (data.walkSchedule as string) || '',
    medicationInstructions: (data.medicationInstructions as string) || '',
    sleepInstructions: (data.sleepInstructions as string) || '',
    specialWarnings: (data.specialWarnings as string) || '',
    createdAt: toDateOrNow(data.createdAt),
    updatedAt: toDateOrNow(data.updatedAt),
  };
}

function isValidStatusTransition(currentStatus: RequestStatus, nextStatus: RequestStatus): boolean {
  const validTransitions: Record<RequestStatus, RequestStatus[]> = {
    open: ['accepted', 'cancelled'],
    accepted: ['awaiting_confirmation', 'cancelled'],
    awaiting_confirmation: ['completed', 'cancelled'],
    completed: [],
    cancelled: [],
  };

  return validTransitions[currentStatus]?.includes(nextStatus) ?? false;
}

async function fetchRequestRecord(
  ownerId: string,
  requestId: string
): Promise<Record<string, unknown> | null> {
  const payload = await fetchSupabaseReadJson<{ request: Record<string, unknown> | null }>(
    `/api/supabase-read/request?scope=request&ownerId=${encodeURIComponent(ownerId)}&requestId=${encodeURIComponent(requestId)}`,
    { requireAuth: true }
  );

  return payload.request;
}

async function requireRequest(ownerId: string, requestId: string): Promise<Request> {
  const request = await getRequest(ownerId, requestId);
  if (!request) {
    throw new Error('Request not found');
  }

  return request;
}

async function saveRequest(request: Request, actorId: string): Promise<void> {
  await mirrorRequestToSupabase(request, actorId);
}

async function rollbackRequest(request: Request, actorId: string): Promise<void> {
  await saveRequest(request, actorId).catch(() => undefined);
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

  const requestedSitterProfile = await getPublicProfile(requestedSitterId);
  if (!requestedSitterProfile) {
    throw new Error('Requested sitter profile not found.');
  }

  return {
    requestedSitterId,
    requestedSitterName: requestedSitterProfile.name,
  };
}

export async function createRequest(
  ownerId: string,
  data: CreateRequestData
): Promise<string> {
  validateRequestTextFields(data);

  const userPets = await getUserPets(ownerId);
  const validPetIds = userPets.map((pet) => pet.id);
  const invalidPets = data.petIds.filter((petId) => !validPetIds.includes(petId));

  if (invalidPets.length > 0) {
    throw new Error('You can only create requests for your own pets');
  }
  if (data.petIds.length === 0) {
    throw new Error('At least one pet must be selected');
  }

  const ownerProfile = await getProfile(ownerId);
  if (!ownerProfile) {
    throw new Error('Owner profile not found');
  }

  const selectedPets = userPets.filter((pet) => data.petIds.includes(pet.id));
  const audience: RequestAudience = data.audience === 'direct' ? 'direct' : 'community';
  const requestedSitter = await resolveRequestedSitter({
    ownerId,
    audience,
    requestedSitterId: data.requestedSitterId,
  });
  const selectedLocation = getCityLocationPayload(data.location || ownerProfile.location);
  if (!selectedLocation) {
    throw new Error('Select a supported Finnish city');
  }
  const requestId = generateRequestId();
  const now = new Date();
  const request: Request = {
    id: requestId,
    ownerId,
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

  await saveRequest(request, ownerId);

  if (audience === 'direct' && requestedSitter.requestedSitterId) {
    await createNotification({
      userId: requestedSitter.requestedSitterId,
      type: 'direct_request_received',
      relatedRequestId: requestId,
      message: `${ownerProfile.name} sent you a direct request for ${request.petNames.join(', ')}.`,
    }).catch((error) => {
      console.warn('Failed to create direct request notification', error);
    });
  }

  return requestId;
}

export async function getRequest(ownerId: string, requestId: string): Promise<Request | null> {
  const requestRecord = await fetchRequestRecord(ownerId, requestId);
  return requestRecord ? mapRequest(requestId, requestRecord) : null;
}

export async function getRequestById(requestId: string, ownerId?: string): Promise<Request | null> {
  if (ownerId) {
    return getRequest(ownerId, requestId);
  }

  const currentUser = await getCurrentAuthUser();
  if (!currentUser) {
    return null;
  }

  const settledLists = await Promise.allSettled([
    getUserRequests(currentUser.uid),
    getSitterRequests(currentUser.uid),
    getDirectRequestsForSitter(currentUser.uid),
    getAllOpenRequests(currentUser.uid),
  ]);

  const visibleRequests = settledLists.flatMap((result) =>
    result.status === 'fulfilled' ? result.value : []
  );

  return visibleRequests.find((request) => request.id === requestId) ?? null;
}

export async function getUserRequests(ownerId: string): Promise<Request[]> {
  const payload = await fetchSupabaseReadJson<{ requests: Array<Record<string, unknown>> }>(
    `/api/supabase-read/request?scope=user-requests&ownerId=${encodeURIComponent(ownerId)}`,
    { requireAuth: true }
  );

  return payload.requests.map((request) => mapRequest((request.id as string) || '', request));
}

export async function updateRequest(
  ownerId: string,
  requestId: string,
  data: UpdateRequestData
): Promise<void> {
  validateRequestTextFields(data);

  const request = await requireRequest(ownerId, requestId);
  if (request.status !== 'open') {
    throw new Error('Can only edit open requests');
  }

  let petIds = request.petIds;
  let petNames = request.petNames;

  if (data.petIds) {
    if (data.petIds.length === 0) {
      throw new Error('At least one pet must be selected');
    }

    const userPets = await getUserPets(ownerId);
    const validPetIds = userPets.map((pet) => pet.id);
    const invalidPets = data.petIds.filter((petId) => !validPetIds.includes(petId));
    if (invalidPets.length > 0) {
      throw new Error('You can only select your own pets');
    }

    petIds = data.petIds;
    petNames = userPets.filter((pet) => data.petIds?.includes(pet.id)).map((pet) => pet.name);
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

  await saveRequest(
    {
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
    },
    ownerId
  );
}

export async function changeRequestStatus(
  ownerId: string,
  requestId: string,
  newStatus: RequestStatus,
  sitterId?: string,
  sitterName?: string
): Promise<void> {
  const request = await requireRequest(ownerId, requestId);
  if (!isValidStatusTransition(request.status, newStatus)) {
    throw new Error(`Cannot transition from ${request.status} to ${newStatus}`);
  }

  await saveRequest(
    {
      ...request,
      status: newStatus,
      sitterId: newStatus === 'accepted' ? sitterId : request.sitterId,
      sitterName: newStatus === 'accepted' ? sitterName : request.sitterName,
      updatedAt: new Date(),
    },
    ownerId
  );
}

export async function cancelRequest(ownerId: string, requestId: string): Promise<void> {
  const request = await requireRequest(ownerId, requestId);

  if (request.status === 'accepted') {
    throw new Error('Use cancelAcceptedRequest to cancel an accepted request (requires escrow refund)');
  }
  if (request.status !== 'open') {
    throw new Error(`Cannot cancel request with status: ${request.status}`);
  }

  await changeRequestStatus(ownerId, requestId, 'cancelled');
}

export async function deleteRequest(ownerId: string, requestId: string): Promise<void> {
  const request = await requireRequest(ownerId, requestId);
  if (request.status !== 'open' && request.status !== 'cancelled') {
    throw new Error('Can only delete open or cancelled requests');
  }

  await deleteRequestFromSupabase(ownerId, requestId, ownerId);
}

export async function getAllOpenRequests(
  excludeUserId?: string,
  options: { limit?: number } = {}
): Promise<Request[]> {
  const params = new URLSearchParams({ scope: 'all-open' });
  if (excludeUserId) {
    params.set('excludeUserId', excludeUserId);
  }
  if (typeof options.limit === 'number' && Number.isFinite(options.limit) && options.limit > 0) {
    params.set('limit', String(Math.floor(options.limit)));
  }

  const payload = await fetchSupabaseReadJson<{ requests: Array<Record<string, unknown>> }>(
    `/api/supabase-read/request?${params.toString()}`,
    { requireAuth: true }
  );

  return payload.requests.map((request) => mapRequest((request.id as string) || '', request));
}

export async function getDirectRequestsForSitter(sitterId: string): Promise<Request[]> {
  const payload = await fetchSupabaseReadJson<{ requests: Array<Record<string, unknown>> }>(
    `/api/supabase-read/request?scope=direct-for-sitter&sitterId=${encodeURIComponent(sitterId)}`,
    { requireAuth: true }
  );

  return payload.requests.map((request) => mapRequest((request.id as string) || '', request));
}

export async function getSitterRequests(sitterId: string): Promise<Request[]> {
  const payload = await fetchSupabaseReadJson<{ requests: Array<Record<string, unknown>> }>(
    `/api/supabase-read/request?scope=sitter-requests&sitterId=${encodeURIComponent(sitterId)}`,
    { requireAuth: true }
  );

  return payload.requests.map((request) => mapRequest((request.id as string) || '', request));
}

export async function applyToRequest(
  ownerId: string,
  requestId: string,
  sitterId: string,
  message: string = ''
): Promise<void> {
  assertNoMoneyLanguage(message);

  if (ownerId === sitterId) {
    throw new Error('You cannot apply to your own request');
  }

  const sitterProfile = await getProfile(sitterId);
  if (!sitterProfile) {
    throw new Error('Sitter profile not found');
  }
  if (sitterProfile.availability !== 'available') {
    throw new Error('Set your availability to Available before applying');
  }

  const request = await requireRequest(ownerId, requestId);
  if (request.status !== 'open') {
    throw new Error('This request is no longer open');
  }
  if (
    request.audience === 'direct' &&
    request.requestedSitterId &&
    request.requestedSitterId !== sitterId
  ) {
    throw new Error('This direct request was sent to another sitter.');
  }

  const availabilityMatch = await getAvailabilityMatch(
    sitterId,
    request.startDate,
    request.endDate
  );
  if (!availabilityMatch.available) {
    if (availabilityMatch.hasConflict) {
      throw new Error('You already have another confirmed booking during these dates');
    }
    throw new Error('Add an availability slot that fully covers these dates before applying');
  }

  const alreadyApplied = (request.applications ?? []).some(
    (application) => application.sitterId === sitterId
  );
  if (alreadyApplied) {
    throw new Error('You have already applied to this request');
  }

  const updatedRequest: Request = {
    ...request,
    applications: [
      ...(request.applications ?? []),
      {
        sitterId,
        sitterName: sitterProfile.name,
        message,
        appliedAt: new Date(),
      },
    ],
    updatedAt: new Date(),
  };

  await saveRequest(updatedRequest, sitterId);
  await ensureConversation(ownerId, requestId, sitterId, sitterProfile.name);
  await createNotification({
    userId: ownerId,
    type: 'application_received',
    relatedRequestId: requestId,
    message: `${sitterProfile.name} applied to your request.`,
  });
}

export async function withdrawApplication(
  ownerId: string,
  requestId: string,
  sitterId: string
): Promise<void> {
  const request = await requireRequest(ownerId, requestId);
  if (request.status !== 'open') {
    throw new Error('Cannot withdraw application after request is no longer open');
  }

  const nextApplications = (request.applications ?? []).filter(
    (application) => application.sitterId !== sitterId
  );
  if (nextApplications.length === (request.applications ?? []).length) {
    throw new Error('Application not found');
  }

  await saveRequest(
    {
      ...request,
      applications: nextApplications,
      updatedAt: new Date(),
    },
    sitterId
  );
}

export async function acceptApplication(
  ownerId: string,
  requestId: string,
  sitterId: string
): Promise<void> {
  const request = await requireRequest(ownerId, requestId);
  if (request.status !== 'open') {
    throw new Error('Request is no longer open');
  }

  const selectedApplication = (request.applications ?? []).find(
    (application) => application.sitterId === sitterId
  );
  if (!selectedApplication) {
    throw new Error('Selected sitter has not applied');
  }
  if (request.creditsOffered <= 0) {
    throw new Error('Invalid credits offered');
  }

  const availabilityMatch = await getAvailabilityMatch(
    sitterId,
    request.startDate,
    request.endDate
  );
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

  await saveRequest(acceptedRequest, ownerId);

  try {
    await escrowCredits(
      ownerId,
      request.creditsOffered,
      requestId,
      `Escrow for request ${requestId}`,
      ownerId
    );
  } catch (error) {
    await rollbackRequest(request, ownerId);
    throw error;
  }

  await ensureConversation(ownerId, requestId, sitterId, selectedApplication.sitterName);
  await createNotification({
    userId: sitterId,
    type: 'application_accepted',
    relatedRequestId: requestId,
    message: `Your application was accepted by ${request.ownerName || 'Owner'}.`,
  });
}

export async function acceptRequest(
  ownerId: string,
  requestId: string,
  sitterId: string
): Promise<void> {
  if (ownerId === sitterId) {
    throw new Error('You cannot accept your own request');
  }

  const sitterProfile = await getProfile(sitterId);
  if (!sitterProfile) {
    throw new Error('Sitter profile not found');
  }
  if (sitterProfile.availability !== 'available') {
    throw new Error('Set your availability to Available before accepting requests');
  }

  const request = await requireRequest(ownerId, requestId);
  if (request.audience !== 'direct' || request.requestedSitterId !== sitterId) {
    throw new Error('This direct request was sent to another sitter.');
  }
  if (request.status !== 'open') {
    throw new Error('Request is no longer open');
  }
  if (request.creditsOffered <= 0) {
    throw new Error('Invalid credits offered');
  }

  const availabilityMatch = await getAvailabilityMatch(
    sitterId,
    request.startDate,
    request.endDate
  );
  if (!availabilityMatch.available) {
    if (availabilityMatch.hasConflict) {
      throw new Error('You already have another confirmed booking during these dates');
    }
    throw new Error('You do not have an availability slot covering these dates');
  }

  const acceptedRequest: Request = {
    ...request,
    status: 'accepted',
    escrowStatus: 'held',
    sitterId,
    sitterName: sitterProfile.name,
    applications: [],
    updatedAt: new Date(),
  };

  await saveRequest(acceptedRequest, sitterId);

  try {
    await escrowCredits(
      ownerId,
      request.creditsOffered,
      requestId,
      `Escrow for request ${requestId}`,
      sitterId
    );
  } catch (error) {
    await rollbackRequest(request, sitterId);
    throw error;
  }

  await ensureConversation(ownerId, requestId, sitterId, sitterProfile.name);
}

export async function markAwaitingConfirmation(
  ownerId: string,
  requestId: string,
  sitterId: string
): Promise<void> {
  const request = await requireRequest(ownerId, requestId);

  if (request.status !== 'accepted') {
    throw new Error(`Cannot mark request with status ${request.status} as awaiting confirmation`);
  }
  if (request.escrowStatus !== 'held') {
    throw new Error('Escrow must be held before moving to awaiting confirmation');
  }
  if (request.sitterId !== sitterId) {
    throw new Error('Only the assigned sitter can mark this request as awaiting confirmation');
  }

  await saveRequest(
    {
      ...request,
      status: 'awaiting_confirmation',
      markedCompleteAt: new Date(),
      updatedAt: new Date(),
    },
    sitterId
  );

  await createNotification({
    userId: ownerId,
    type: 'request_completed',
    relatedRequestId: requestId,
    message: 'The sitter marked this task as complete. Please confirm to release credits.',
  });
}

export async function confirmCompletion(
  ownerId: string,
  requestId: string,
  confirmedBy?: string
): Promise<void> {
  if (confirmedBy && confirmedBy !== ownerId) {
    throw new Error('Only the request owner can confirm completion');
  }

  const request = await requireRequest(ownerId, requestId);
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
  if (request.creditsOffered <= 0) {
    throw new Error('Invalid credits offered');
  }

  const completedRequest: Request = {
    ...request,
    status: 'completed',
    escrowStatus: 'released',
    confirmedCompleteAt: new Date(),
    updatedAt: new Date(),
  };

  await saveRequest(completedRequest, ownerId);

  try {
    await releaseEscrow(
      sitterId,
      request.creditsOffered,
      requestId,
      `Reward completed for request ${requestId}`,
      ownerId
    );
  } catch (error) {
    await rollbackRequest(request, ownerId);
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

  try {
    await syncProfileMetricsToSupabase({
      actorId: ownerId,
      targetUserId: sitterId,
      relatedRequestId: requestId,
      recalculateTrustScore: true,
    });
  } catch (error) {
    console.warn('Unable to refresh sitter trust score after completion:', error);
  }

  await logRepeatedPairActivity(ownerId, sitterId, requestId);
}

export async function cancelAcceptedRequest(
  ownerId: string,
  requestId: string,
  cancelledBy: string
): Promise<void> {
  const request = await requireRequest(ownerId, requestId);

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
  if (cancelledBy !== ownerId && cancelledBy !== request.sitterId) {
    throw new Error('Only owner or assigned sitter can cancel the request');
  }
  if (request.creditsOffered <= 0) {
    throw new Error('Invalid credits offered');
  }

  const cancelledRequest: Request = {
    ...request,
    status: 'cancelled',
    escrowStatus: 'refunded',
    updatedAt: new Date(),
  };

  await saveRequest(cancelledRequest, cancelledBy);

  try {
    await refundEscrow(
      ownerId,
      request.creditsOffered,
      requestId,
      `Refund for cancelled request ${requestId}`,
      cancelledBy
    );
  } catch (error) {
    await rollbackRequest(request, cancelledBy);
    throw error;
  }
}

export async function submitReview(
  ownerId: string,
  requestId: string,
  rating: number,
  comment: string
): Promise<void> {
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    throw new Error('Rating must be between 1 and 5');
  }

  const request = await requireRequest(ownerId, requestId);
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

  const publicSitterProfile = await getPublicProfile(sitterId);
  if (!publicSitterProfile) {
    throw new Error('Sitter public profile not found');
  }

  const review: RequestReview = {
    rating,
    comment: comment.trim(),
    reviewerId: ownerId,
    reviewerName: request.ownerName || 'Owner',
    reviewedAt: new Date(),
  };

  await saveRequest(
    {
      ...request,
      review,
      ownerReview: review,
      updatedAt: new Date(),
    },
    ownerId
  );

  await createNotification({
    userId: sitterId,
    type: 'review_received',
    relatedRequestId: requestId,
    message: 'You received a new review.',
  });

  const nextRatingCount = publicSitterProfile.ratingCount + 1;
  const nextRatingAverage =
    (publicSitterProfile.ratingAverage * publicSitterProfile.ratingCount + rating) /
    nextRatingCount;

  try {
    await syncProfileMetricsToSupabase({
      actorId: ownerId,
      targetUserId: sitterId,
      relatedRequestId: requestId,
      ratingAverage: nextRatingAverage,
      ratingCount: nextRatingCount,
      recalculateTrustScore: true,
    });
  } catch (error) {
    console.warn('Unable to refresh sitter profile metrics after review:', error);
  }
}

export async function getSitterReviews(sitterId: string): Promise<RequestReview[]> {
  const sitterRequests = await getSitterRequests(sitterId);
  return sitterRequests
    .filter((request) => request.status === 'completed' && Boolean(request.review || request.ownerReview))
    .map((request) => request.ownerReview ?? request.review)
    .filter((review): review is RequestReview => Boolean(review))
    .sort((left, right) => right.reviewedAt.getTime() - left.reviewedAt.getTime());
}
