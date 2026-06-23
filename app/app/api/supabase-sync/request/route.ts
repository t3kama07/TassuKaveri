import { NextRequest, NextResponse } from 'next/server';
import { readBearerToken, verifySessionToken } from '@/lib/serverAuth';
import {
  deleteRequestInSupabase,
  getRequestByIdOnlyFromSupabase,
  type SupabaseRequestInput,
  upsertRequestInSupabase,
} from '@/lib/supabaseRequestStore';

type RequestSyncPayload =
  | {
      action?: 'upsert';
      actorId?: string;
      request?: Partial<SupabaseRequestInput>;
    }
  | {
      action: 'delete';
      actorId?: string;
      ownerId?: string;
      requestId?: string;
    };

function isRequestSyncPayload(value: unknown): value is RequestSyncPayload {
  return Boolean(value && typeof value === 'object');
}

function isRequestUpsertPayload(
  value: RequestSyncPayload
): value is {
  action?: 'upsert';
  actorId?: string;
  request: Partial<SupabaseRequestInput>;
} {
  return 'request' in value && Boolean(value.request && typeof value.request === 'object');
}

function valuesMatch(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function statusTransitionAllowed(
  currentStatus: string,
  nextStatus: string,
  allowedTransitions: Record<string, string[]>
): boolean {
  return currentStatus === nextStatus || allowedTransitions[currentStatus]?.includes(nextStatus) === true;
}

function expectedEscrowStatus(status: string): string[] {
  switch (status) {
    case 'open':
      return ['none'];
    case 'accepted':
    case 'awaiting_confirmation':
      return ['held'];
    case 'completed':
      return ['released'];
    case 'cancelled':
      return ['none', 'refunded'];
    default:
      return [];
  }
}

function nonOwnerFieldsAreUnchanged(
  currentRequest: Record<string, unknown>,
  nextRequest: Record<string, unknown>
): boolean {
  const immutableFields = [
    'id',
    'ownerId',
    'ownerName',
    'petIds',
    'petNames',
    'careType',
    'startDate',
    'endDate',
    'location',
    'latitude',
    'longitude',
    'locationLat',
    'locationLng',
    'creditsOffered',
    'audience',
    'requestedSitterId',
    'requestedSitterName',
    'notes',
    'feedingSchedule',
    'walkSchedule',
    'medicationInstructions',
    'sleepInstructions',
    'specialWarnings',
    'review',
    'ownerReview',
    'sitterReview',
    'confirmedCompleteAt',
    'createdAt',
  ];

  return immutableFields.every((field) => valuesMatch(currentRequest[field], nextRequest[field]));
}

export async function POST(request: NextRequest) {
  try {
    const idToken = readBearerToken(request.headers);
    if (!idToken) {
      return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 });
    }

    const sessionUser = await verifySessionToken(idToken);
    if (!sessionUser) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const payload = await request.json();
    if (!isRequestSyncPayload(payload)) {
      return NextResponse.json({ error: 'Invalid request sync payload' }, { status: 400 });
    }

    if (typeof payload.actorId !== 'string') {
      return NextResponse.json({ error: 'actorId is required for request sync' }, { status: 400 });
    }

    if (payload.actorId !== sessionUser.uid) {
      return NextResponse.json({ error: 'Actor mismatch for request sync' }, { status: 403 });
    }

    if (payload.action === 'delete') {
      if (typeof payload.ownerId !== 'string' || typeof payload.requestId !== 'string') {
        return NextResponse.json({ error: 'ownerId and requestId are required' }, { status: 400 });
      }

      if (payload.ownerId !== payload.actorId) {
        return NextResponse.json({ error: 'Only the request owner can delete it' }, { status: 403 });
      }

      await deleteRequestInSupabase(payload.ownerId, payload.requestId);
      return NextResponse.json({ ok: true });
    }

    if (!isRequestUpsertPayload(payload)) {
      return NextResponse.json({ error: 'Request payload is required' }, { status: 400 });
    }

    const nextRequest = payload.request;
    if (
      typeof nextRequest.id !== 'string' ||
      typeof nextRequest.ownerId !== 'string' ||
      typeof nextRequest.ownerName !== 'string'
    ) {
      return NextResponse.json(
        { error: 'Request id, ownerId, and ownerName are required' },
        { status: 400 }
      );
    }

    if (
      typeof nextRequest.status !== 'string' ||
      typeof nextRequest.escrowStatus !== 'string' ||
      typeof nextRequest.creditsOffered !== 'number' ||
      !Number.isFinite(nextRequest.creditsOffered) ||
      nextRequest.creditsOffered <= 0
    ) {
      return NextResponse.json({ error: 'Invalid request status or credits' }, { status: 400 });
    }

    if (!expectedEscrowStatus(nextRequest.status).includes(nextRequest.escrowStatus)) {
      return NextResponse.json({ error: 'Request escrow status does not match its status' }, { status: 400 });
    }

    const currentRequest = await getRequestByIdOnlyFromSupabase(nextRequest.id);
    if (!currentRequest) {
      const hasAssignedSitter = Boolean(nextRequest.sitterId || nextRequest.sitterName);
      const hasApplications = Array.isArray(nextRequest.applications) && nextRequest.applications.length > 0;
      const hasReview = Boolean(nextRequest.review || nextRequest.ownerReview || nextRequest.sitterReview);
      if (
        nextRequest.ownerId !== payload.actorId ||
        nextRequest.status !== 'open' ||
        nextRequest.escrowStatus !== 'none' ||
        hasAssignedSitter ||
        hasApplications ||
        hasReview
      ) {
        return NextResponse.json({ error: 'Invalid new request state' }, { status: 403 });
      }
    } else {
      if (currentRequest.ownerId !== nextRequest.ownerId) {
        return NextResponse.json({ error: 'Request ownership cannot be changed' }, { status: 403 });
      }

      const actorIsOwner = payload.actorId === currentRequest.ownerId;
      const actorIsAssignedSitter = payload.actorId === currentRequest.sitterId;
      const actorIsRequestedSitter = payload.actorId === currentRequest.requestedSitterId;
      const actorIsApplicant = (currentRequest.applications ?? []).some(
        (application) => application.sitterId === payload.actorId
      );
      const actorCanApply =
        currentRequest.status === 'open' &&
        currentRequest.audience === 'community' &&
        payload.actorId !== currentRequest.ownerId;

      if (
        !actorIsOwner &&
        !actorIsAssignedSitter &&
        !actorIsRequestedSitter &&
        !actorIsApplicant &&
        !actorCanApply
      ) {
        return NextResponse.json({ error: 'Forbidden request sync target' }, { status: 403 });
      }

      if (actorIsOwner) {
        const ownerTransitions: Record<string, string[]> = {
          open: ['accepted', 'cancelled'],
          accepted: ['open', 'cancelled'],
          awaiting_confirmation: ['completed', 'cancelled'],
          completed: [],
          cancelled: [],
        };
        if (!statusTransitionAllowed(currentRequest.status, nextRequest.status, ownerTransitions)) {
          return NextResponse.json({ error: 'Invalid owner request transition' }, { status: 409 });
        }
        if (
          currentRequest.status === 'open' &&
          nextRequest.status === 'accepted' &&
          !(currentRequest.applications ?? []).some(
            (application) => application.sitterId === nextRequest.sitterId
          )
        ) {
          return NextResponse.json({ error: 'The accepted sitter did not apply to this request' }, { status: 403 });
        }
        const currentReview = currentRequest.ownerReview ?? currentRequest.review;
        const nextReview = nextRequest.ownerReview ?? nextRequest.review;
        if (currentReview && !valuesMatch(currentReview, nextReview)) {
          return NextResponse.json({ error: 'A submitted review cannot be changed' }, { status: 409 });
        }
        if (
          nextReview &&
          (!Number.isFinite(nextReview.rating) ||
            nextReview.rating < 1 ||
            nextReview.rating > 5 ||
            nextReview.reviewerId !== currentRequest.ownerId)
        ) {
          return NextResponse.json({ error: 'Invalid request review' }, { status: 400 });
        }
      } else {
        if (
          !nonOwnerFieldsAreUnchanged(
            currentRequest as unknown as Record<string, unknown>,
            nextRequest as unknown as Record<string, unknown>
          )
        ) {
          return NextResponse.json({ error: 'Only the owner can edit request details' }, { status: 403 });
        }

        if (actorIsAssignedSitter) {
          const sitterTransitions: Record<string, string[]> = {
            accepted: ['open', 'awaiting_confirmation', 'cancelled'],
            awaiting_confirmation: ['cancelled'],
          };
          if (!statusTransitionAllowed(currentRequest.status, nextRequest.status, sitterTransitions)) {
            return NextResponse.json({ error: 'Invalid sitter request transition' }, { status: 409 });
          }
        } else if (actorIsRequestedSitter) {
          if (
            currentRequest.audience !== 'direct' ||
            currentRequest.status !== 'open' ||
            nextRequest.status !== 'accepted' ||
            nextRequest.sitterId !== payload.actorId
          ) {
            return NextResponse.json({ error: 'Invalid direct request acceptance' }, { status: 403 });
          }
        } else {
          if (currentRequest.status !== 'open' || nextRequest.status !== 'open') {
            return NextResponse.json({ error: 'Applicants cannot change request status' }, { status: 403 });
          }
          const currentOtherApplications = (currentRequest.applications ?? []).filter(
            (application) => application.sitterId !== payload.actorId
          );
          const nextOtherApplications = (nextRequest.applications ?? []).filter(
            (application) => application.sitterId !== payload.actorId
          );
          if (!valuesMatch(currentOtherApplications, nextOtherApplications)) {
            return NextResponse.json({ error: 'Applicants can update only their own offer' }, { status: 403 });
          }
        }
      }
    }

    await upsertRequestInSupabase(nextRequest as SupabaseRequestInput);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected request sync failure';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

