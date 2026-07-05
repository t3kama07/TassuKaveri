import {
  CreateRequestData,
  Request,
  RequestApplication,
  RequestAudience,
  RequestReview,
  RequestStatus,
  UpdateRequestData,
} from '@/types/request';
import { fetchSupabaseReadJson } from './supabaseReadClient';
import { getCurrentAuthUser, getSupabaseAuthHeaders } from './supabaseAuthClient';

const MILLISECONDS_PER_HOUR = 60 * 60 * 1000;

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
    cancelledBy: (data.cancelledBy as Request['cancelledBy']) || undefined,
    cancelledAt: toOptionalDate(data.cancelledAt),
    cancellationCreditOutcome:
      (data.cancellationCreditOutcome as Request['cancellationCreditOutcome']) || undefined,
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

async function postRequestAction<T>(
  actorId: string,
  payload: Record<string, unknown>
): Promise<T> {
  const response = await fetch('/api/supabase-sync/request', {
    method: 'POST',
    headers: {
      ...(await getSupabaseAuthHeaders(actorId)),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      actorId,
      ...payload,
    }),
  });

  const responseText = await response.text();
  if (!response.ok) {
    let errorMessage = responseText || 'Request action failed';
    try {
      const parsed = JSON.parse(responseText) as { error?: string };
      errorMessage = parsed.error || errorMessage;
    } catch {
      // Keep the raw response text when the body is not JSON.
    }
    throw new Error(errorMessage);
  }

  return responseText ? (JSON.parse(responseText) as T) : ({} as T);
}

export async function createRequest(
  ownerId: string,
  data: CreateRequestData
): Promise<string> {
  const result = await postRequestAction<{ requestId: string }>(ownerId, {
    action: 'create-request',
    data,
  });

  return result.requestId;
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
  await postRequestAction(ownerId, {
    action: 'update-request',
    ownerId,
    requestId,
    data,
  });
}

export async function changeRequestStatus(
  ownerId: string,
  requestId: string,
  newStatus: RequestStatus,
  sitterId?: string,
  sitterName?: string
): Promise<void> {
  if (newStatus !== 'cancelled') {
    throw new Error('Use the dedicated request action for this status change');
  }

  void sitterId;
  void sitterName;
  await cancelRequest(ownerId, requestId);
}

export async function cancelRequest(ownerId: string, requestId: string): Promise<void> {
  await postRequestAction(ownerId, {
    action: 'cancel-request',
    ownerId,
    requestId,
  });
}

export async function deleteRequest(ownerId: string, requestId: string): Promise<void> {
  await postRequestAction(ownerId, {
    action: 'delete-request',
    ownerId,
    requestId,
  });
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

export type SitterCancellationStats = {
  completedCount: number;
  sitterCancelledCount: number;
  sitterLateCancelledCount: number;
  totalFinishedOrCancelled: number;
  cancellationRatio: number;
};

export async function getSitterCancellationStats(
  sitterId: string
): Promise<SitterCancellationStats> {
  const payload = await fetchSupabaseReadJson<SitterCancellationStats>(
    `/api/supabase-read/request?scope=sitter-cancellation-stats&sitterId=${encodeURIComponent(sitterId)}`,
    { requireAuth: true }
  );

  return payload;
}

export async function applyToRequest(
  ownerId: string,
  requestId: string,
  sitterId: string,
  message: string = ''
): Promise<void> {
  await postRequestAction(sitterId, {
    action: 'apply-to-request',
    ownerId,
    requestId,
    message,
  });
}

export async function withdrawApplication(
  ownerId: string,
  requestId: string,
  sitterId: string
): Promise<void> {
  await postRequestAction(sitterId, {
    action: 'withdraw-application',
    ownerId,
    requestId,
  });
}

export async function acceptApplication(
  ownerId: string,
  requestId: string,
  sitterId: string
): Promise<void> {
  await postRequestAction(ownerId, {
    action: 'accept-application',
    ownerId,
    requestId,
    sitterId,
  });
}

export async function acceptRequest(
  ownerId: string,
  requestId: string,
  sitterId: string
): Promise<void> {
  await postRequestAction(sitterId, {
    action: 'accept-direct-request',
    ownerId,
    requestId,
  });
}

export async function markAwaitingConfirmation(
  ownerId: string,
  requestId: string,
  sitterId: string
): Promise<void> {
  await postRequestAction(sitterId, {
    action: 'mark-awaiting-confirmation',
    ownerId,
    requestId,
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

  await postRequestAction(confirmedBy ?? ownerId, {
    action: 'confirm-completion',
    ownerId,
    requestId,
  });
}

export async function cancelAcceptedRequest(
  ownerId: string,
  requestId: string,
  cancelledBy: string
): Promise<void> {
  await postRequestAction(cancelledBy, {
    action: 'cancel-accepted-request',
    ownerId,
    requestId,
  });
}

export async function submitReview(
  ownerId: string,
  requestId: string,
  rating: number,
  comment: string
): Promise<void> {
  await postRequestAction(ownerId, {
    action: 'submit-review',
    ownerId,
    requestId,
    rating,
    comment,
  });
}

export async function getSitterReviews(sitterId: string): Promise<RequestReview[]> {
  const sitterRequests = await getSitterRequests(sitterId);
  return sitterRequests
    .filter((request) => request.status === 'completed' && Boolean(request.review || request.ownerReview))
    .map((request) => request.ownerReview ?? request.review)
    .filter((review): review is RequestReview => Boolean(review))
    .sort((left, right) => right.reviewedAt.getTime() - left.reviewedAt.getTime());
}
