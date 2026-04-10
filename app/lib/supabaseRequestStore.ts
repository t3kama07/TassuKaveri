import { Request, RequestApplication, RequestReview } from '@/types/request';
import { createSupabaseAdminClient } from './supabaseAdmin';
import { PILOT_CITY } from './platformPolicy';

type DateInput = Date | string | number | null | undefined;
type SupabaseRequestRow = {
  id: string;
  owner_uid: string;
  owner_name: string;
  pet_ids: string[] | null;
  pet_names: string[] | null;
  care_type: Request['careType'];
  start_date: string;
  end_date: string;
  location: string;
  location_lat: number | null;
  location_lng: number | null;
  credits_offered: number;
  status: Request['status'];
  audience: Request['audience'];
  escrow_status: Request['escrowStatus'] | null;
  sitter_uid: string | null;
  sitter_name: string | null;
  requested_sitter_uid: string | null;
  requested_sitter_name: string | null;
  applications: unknown;
  review: unknown;
  owner_review: unknown;
  sitter_review: unknown;
  marked_complete_at: string | null;
  confirmed_complete_at: string | null;
  notes: string;
  feeding_schedule: string;
  walk_schedule: string;
  medication_instructions: string;
  sleep_instructions: string;
  special_warnings: string;
  created_at: string;
  updated_at: string;
};

type RequestApplicationInput = Omit<RequestApplication, 'appliedAt'> & {
  appliedAt?: DateInput;
};

type RequestReviewInput = Omit<RequestReview, 'reviewedAt'> & {
  reviewedAt?: DateInput;
};

export interface SupabaseRequestInput
  extends Omit<
    Request,
    | 'startDate'
    | 'endDate'
    | 'applications'
    | 'review'
    | 'ownerReview'
    | 'sitterReview'
    | 'markedCompleteAt'
    | 'confirmedCompleteAt'
    | 'createdAt'
    | 'updatedAt'
  > {
  startDate: DateInput;
  endDate: DateInput;
  applications?: RequestApplicationInput[];
  review?: RequestReviewInput;
  ownerReview?: RequestReviewInput;
  sitterReview?: RequestReviewInput;
  markedCompleteAt?: DateInput;
  confirmedCompleteAt?: DateInput;
  createdAt: DateInput;
  updatedAt: DateInput;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function toIsoString(value: DateInput, fallback: Date): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  return fallback.toISOString();
}

function toDate(value: unknown, fallback = new Date()): Date {
  if (value instanceof Date) {
    return value;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }

  return fallback;
}

function parseApplication(value: unknown): RequestApplication | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const application = value as Record<string, unknown>;
  const sitterId = asString(application.sitterId);
  const sitterName = asString(application.sitterName);
  if (!sitterId || !sitterName) {
    return null;
  }

  return {
    sitterId,
    sitterName,
    message: asString(application.message),
    appliedAt: toDate(application.appliedAt),
  };
}

function parseReview(value: unknown): RequestReview | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const review = value as Record<string, unknown>;
  const rating = asNumber(review.rating);
  const reviewerId = asString(review.reviewerId);
  const reviewerName = asString(review.reviewerName);

  if (!rating || !reviewerId || !reviewerName) {
    return undefined;
  }

  return {
    rating,
    comment: asString(review.comment),
    reviewerId,
    reviewerName,
    reviewedAt: toDate(review.reviewedAt),
  };
}

function mapSupabaseRequestRow(row: SupabaseRequestRow): Request {
  const ownerReview = parseReview(row.owner_review ?? row.review);
  const sitterReview = parseReview(row.sitter_review);

  return {
    id: row.id,
    ownerId: row.owner_uid,
    ownerName: row.owner_name || '',
    petIds: Array.isArray(row.pet_ids) ? row.pet_ids : [],
    petNames: Array.isArray(row.pet_names) ? row.pet_names : [],
    careType: row.care_type || 'daily-visit',
    startDate: toDate(row.start_date),
    endDate: toDate(row.end_date),
    location: row.location || '',
    locationLat: typeof row.location_lat === 'number' ? row.location_lat : undefined,
    locationLng: typeof row.location_lng === 'number' ? row.location_lng : undefined,
    creditsOffered: typeof row.credits_offered === 'number' ? row.credits_offered : 0,
    status: row.status || 'open',
    audience: row.audience || 'community',
    escrowStatus: row.escrow_status || 'none',
    sitterId: row.sitter_uid || undefined,
    sitterName: row.sitter_name || undefined,
    requestedSitterId: row.requested_sitter_uid || undefined,
    requestedSitterName: row.requested_sitter_name || undefined,
    applications: Array.isArray(row.applications)
      ? row.applications
          .map(parseApplication)
          .filter((application): application is RequestApplication => application !== null)
      : [],
    review: ownerReview,
    ownerReview,
    sitterReview,
    markedCompleteAt: row.marked_complete_at ? toDate(row.marked_complete_at) : undefined,
    confirmedCompleteAt: row.confirmed_complete_at
      ? toDate(row.confirmed_complete_at)
      : undefined,
    notes: row.notes || '',
    feedingSchedule: row.feeding_schedule || '',
    walkSchedule: row.walk_schedule || '',
    medicationInstructions: row.medication_instructions || '',
    sleepInstructions: row.sleep_instructions || '',
    specialWarnings: row.special_warnings || '',
    createdAt: toDate(row.created_at),
    updatedAt: toDate(row.updated_at),
  };
}

function mapApplication(application: RequestApplicationInput): Record<string, unknown> {
  return {
    sitterId: asString(application.sitterId),
    sitterName: asString(application.sitterName),
    message: asString(application.message),
    appliedAt: toIsoString(application.appliedAt, new Date()),
  };
}

function mapReview(review: RequestReviewInput | undefined): Record<string, unknown> | null {
  if (!review) {
    return null;
  }

  return {
    rating: asNumber(review.rating),
    comment: asString(review.comment),
    reviewerId: asString(review.reviewerId),
    reviewerName: asString(review.reviewerName),
    reviewedAt: toIsoString(review.reviewedAt, new Date()),
  };
}

function mapRequestToSupabaseRow(request: SupabaseRequestInput): Record<string, unknown> {
  const now = new Date();

  return {
    id: request.id,
    owner_uid: request.ownerId,
    owner_name: asString(request.ownerName),
    pet_ids: asStringArray(request.petIds),
    pet_names: asStringArray(request.petNames),
    care_type: asString(request.careType, 'daily-visit'),
    start_date: toIsoString(request.startDate, now),
    end_date: toIsoString(request.endDate, now),
    location: asString(request.location),
    location_lat:
      typeof request.locationLat === 'number' && Number.isFinite(request.locationLat)
        ? request.locationLat
        : null,
    location_lng:
      typeof request.locationLng === 'number' && Number.isFinite(request.locationLng)
        ? request.locationLng
        : null,
    credits_offered: asNumber(request.creditsOffered),
    status: asString(request.status, 'open'),
    audience: asString(request.audience, 'community'),
    escrow_status: asString(request.escrowStatus, 'none'),
    sitter_uid: request.sitterId ? asString(request.sitterId) : null,
    sitter_name: request.sitterName ? asString(request.sitterName) : null,
    requested_sitter_uid: request.requestedSitterId ? asString(request.requestedSitterId) : null,
    requested_sitter_name: request.requestedSitterName
      ? asString(request.requestedSitterName)
      : null,
    applications: Array.isArray(request.applications)
      ? request.applications.map(mapApplication)
      : [],
    review: mapReview(request.review),
    owner_review: mapReview(request.ownerReview),
    sitter_review: mapReview(request.sitterReview),
    marked_complete_at: request.markedCompleteAt
      ? toIsoString(request.markedCompleteAt, now)
      : null,
    confirmed_complete_at: request.confirmedCompleteAt
      ? toIsoString(request.confirmedCompleteAt, now)
      : null,
    notes: asString(request.notes),
    feeding_schedule: asString(request.feedingSchedule),
    walk_schedule: asString(request.walkSchedule),
    medication_instructions: asString(request.medicationInstructions),
    sleep_instructions: asString(request.sleepInstructions),
    special_warnings: asString(request.specialWarnings),
    created_at: toIsoString(request.createdAt, now),
    updated_at: toIsoString(request.updatedAt, now),
  };
}

export async function upsertRequestInSupabase(request: SupabaseRequestInput): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from('requests')
    .upsert(mapRequestToSupabaseRow(request), { onConflict: 'id' });

  if (error) {
    throw new Error(`Failed to upsert request in Supabase: ${error.message}`);
  }
}

export async function deleteRequestInSupabase(
  ownerId: string,
  requestId: string
): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from('requests')
    .delete()
    .eq('owner_uid', ownerId)
    .eq('id', requestId);

  if (error) {
    throw new Error(`Failed to delete request in Supabase: ${error.message}`);
  }
}

export async function getRequestByIdFromSupabase(
  ownerId: string,
  requestId: string
): Promise<Request | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('requests')
    .select('*')
    .eq('owner_uid', ownerId)
    .eq('id', requestId)
    .maybeSingle<SupabaseRequestRow>();

  if (error) {
    throw new Error(`Failed to read request from Supabase: ${error.message}`);
  }

  return data ? mapSupabaseRequestRow(data) : null;
}

export async function getUserRequestsFromSupabase(ownerId: string): Promise<Request[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('requests')
    .select('*')
    .eq('owner_uid', ownerId)
    .order('created_at', { ascending: false })
    .returns<SupabaseRequestRow[]>();

  if (error) {
    throw new Error(`Failed to read user requests from Supabase: ${error.message}`);
  }

  return (data || []).map(mapSupabaseRequestRow);
}

export async function getOpenCommunityRequestsFromSupabase(
  excludeUserId?: string
): Promise<Request[]> {
  const supabase = createSupabaseAdminClient();
  let requestQuery = supabase
    .from('requests')
    .select('*')
    .eq('status', 'open')
    .eq('audience', 'community')
    .eq('location', PILOT_CITY)
    .order('created_at', { ascending: false });

  if (excludeUserId) {
    requestQuery = requestQuery.neq('owner_uid', excludeUserId);
  }

  const { data, error } = await requestQuery.returns<SupabaseRequestRow[]>();
  if (error) {
    throw new Error(`Failed to read open requests from Supabase: ${error.message}`);
  }

  return (data || []).map(mapSupabaseRequestRow);
}

export async function getDirectRequestsForSitterFromSupabase(
  sitterId: string
): Promise<Request[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('requests')
    .select('*')
    .eq('status', 'open')
    .eq('audience', 'direct')
    .eq('requested_sitter_uid', sitterId)
    .order('created_at', { ascending: false })
    .returns<SupabaseRequestRow[]>();

  if (error) {
    throw new Error(`Failed to read direct requests from Supabase: ${error.message}`);
  }

  return (data || []).map(mapSupabaseRequestRow);
}

export async function getSitterRequestsFromSupabase(sitterId: string): Promise<Request[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('requests')
    .select('*')
    .eq('sitter_uid', sitterId)
    .order('created_at', { ascending: false })
    .returns<SupabaseRequestRow[]>();

  if (error) {
    throw new Error(`Failed to read sitter requests from Supabase: ${error.message}`);
  }

  return (data || []).map(mapSupabaseRequestRow);
}

export async function getCompletedSitsCountFromSupabase(sitterId: string): Promise<number> {
  const supabase = createSupabaseAdminClient();
  const { count, error } = await supabase
    .from('requests')
    .select('id', { count: 'exact', head: true })
    .eq('sitter_uid', sitterId)
    .eq('status', 'completed');

  if (error) {
    throw new Error(`Failed to count completed sits from Supabase: ${error.message}`);
  }

  return count ?? 0;
}

export async function hasActiveRequestConflictFromSupabase(
  sitterId: string,
  startAt: DateInput,
  endAt: DateInput
): Promise<boolean> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('requests')
    .select('id')
    .eq('sitter_uid', sitterId)
    .in('status', ['accepted', 'awaiting_confirmation'])
    .lt('start_date', toIsoString(endAt, new Date()))
    .gt('end_date', toIsoString(startAt, new Date()))
    .limit(1);

  if (error) {
    throw new Error(`Failed to check request conflict in Supabase: ${error.message}`);
  }

  return Array.isArray(data) && data.length > 0;
}
