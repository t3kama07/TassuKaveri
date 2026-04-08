import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  runTransaction,
  collectionGroup,
  documentId,
} from 'firebase/firestore';
import { db } from './firebase';
import { getAvailabilityMatch } from './availabilityService';
import {
  Request,
  RequestAudience,
  CreateRequestData,
  UpdateRequestData,
  RequestStatus,
  RequestApplication,
  RequestReview,
} from '@/types/request';
import { getUserPets } from './petService';
import { getProfile, recalculateTrustScore } from './profileService';
import { logRepeatedPairActivity } from './moderationService';
import { createNotification } from './notificationService';
import { ensureConversation } from './messageService';
import {
  assertNoMoneyLanguage,
  DEFAULT_RADIUS_KM,
  getPilotLocationPayload,
  getTodayKey,
  MAX_EARNED_CREDITS_PER_DAY,
  PILOT_CITY,
} from './platformPolicy';

/**
 * Get requests collection reference for a user
 */
function getUserRequestsRef(userId: string) {
  return collection(db, 'users', userId, 'requests');
}

const WALLET_DOC = 'main';

function getWalletRef(userId: string) {
  return doc(db, 'users', userId, 'wallet', WALLET_DOC);
}

function getWalletTransactionsRef(userId: string) {
  return collection(db, 'users', userId, 'wallet', WALLET_DOC, 'transactions');
}

function toDateOrNow(value: unknown): Date {
  if (value instanceof Timestamp) {
    return value.toDate();
  }
  if (value instanceof Date) {
    return value;
  }
  return new Date();
}

function toOptionalDate(value: unknown): Date | undefined {
  if (value instanceof Timestamp) {
    return value.toDate();
  }
  if (value instanceof Date) {
    return value;
  }
  return undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function normalizeCity(value: string): string {
  return value.trim().toLowerCase();
}

const MILLISECONDS_PER_HOUR = 60 * 60 * 1000;

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

function createWalletTransactionPayload(
  type: string,
  amount: number,
  reference: string,
  requestId: string,
  balanceAfter: number
) {
  return {
    type,
    amount,
    reference,
    requestId,
    timestamp: serverTimestamp(),
    balanceAfter,
  };
}

/**
 * Validate status transition
 */
function isValidStatusTransition(currentStatus: RequestStatus, newStatus: RequestStatus): boolean {
  const validTransitions: Record<RequestStatus, RequestStatus[]> = {
    open: ['accepted', 'cancelled'],
    accepted: ['awaiting_confirmation', 'cancelled'],
    awaiting_confirmation: ['completed', 'cancelled'],
    completed: [],
    cancelled: [],
  };

  return validTransitions[currentStatus]?.includes(newStatus) ?? false;
}

/**
 * Create a new pet-sitting request
 */
export async function createRequest(
  ownerId: string,
  data: CreateRequestData
): Promise<string> {
  validateRequestTextFields(data);

  // Validate pets belong to owner
  const userPets = await getUserPets(ownerId);
  const validPetIds = userPets.map((p) => p.id);
  const invalidPets = data.petIds.filter((id) => !validPetIds.includes(id));
  
  if (invalidPets.length > 0) {
    throw new Error('You can only create requests for your own pets');
  }

  if (data.petIds.length === 0) {
    throw new Error('At least one pet must be selected');
  }

  const creditsOffered = calculateCreditsForRequestWindow(data.startDate, data.endDate);

  // Get owner profile for name
  const ownerProfile = await getProfile(ownerId);
  if (!ownerProfile) {
    throw new Error('Owner profile not found');
  }

  // Get pet names
  const selectedPets = userPets.filter((p) => data.petIds.includes(p.id));
  const petNames = selectedPets.map((p) => p.name);
  const pilotLocation = getPilotLocationPayload();
  const audience: RequestAudience = data.audience === 'direct' ? 'direct' : 'community';
  let requestedSitterId = '';
  let requestedSitterName = '';

  if (audience === 'direct') {
    requestedSitterId = data.requestedSitterId?.trim() || '';
    if (!requestedSitterId) {
      throw new Error('A direct request must include a sitter.');
    }
    if (requestedSitterId === ownerId) {
      throw new Error('You cannot send a direct request to yourself.');
    }

    const requestedSitterProfile = await getProfile(requestedSitterId);
    if (!requestedSitterProfile) {
      throw new Error('Requested sitter profile not found.');
    }

    requestedSitterName = requestedSitterProfile.name;
  }

  const requestsRef = getUserRequestsRef(ownerId);
  const docRef = await addDoc(requestsRef, {
    ownerId,
    ownerName: ownerProfile.name,
    petIds: data.petIds,
    petNames,
    careType: data.careType,
    startDate: Timestamp.fromDate(data.startDate),
    endDate: Timestamp.fromDate(data.endDate),
    location: pilotLocation.location,
    locationLat: pilotLocation.latitude,
    locationLng: pilotLocation.longitude,
    creditsOffered,
    status: 'open',
    audience,
    escrowStatus: 'none',
    requestedSitterId: requestedSitterId || null,
    requestedSitterName: requestedSitterName || null,
    applications: [],
    notes: data.notes || '',
    feedingSchedule: data.feedingSchedule || '',
    walkSchedule: data.walkSchedule || '',
    medicationInstructions: data.medicationInstructions || '',
    sleepInstructions: data.sleepInstructions || '',
    specialWarnings: data.specialWarnings || '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  if (audience === 'direct' && requestedSitterId) {
    await createNotification({
      userId: requestedSitterId,
      type: 'direct_request_received',
      relatedRequestId: docRef.id,
      message: `${ownerProfile.name} sent you a direct request for ${petNames.join(', ')}.`,
    });
  }

  return docRef.id;
}

/**
 * Get a single request
 */
export async function getRequest(ownerId: string, requestId: string): Promise<Request | null> {
  const requestRef = doc(db, 'users', ownerId, 'requests', requestId);
  const requestSnap = await getDoc(requestRef);

  if (!requestSnap.exists()) {
    return null;
  }

  const data = requestSnap.data();
  return mapRequest(requestSnap.id, data);
}

export async function getRequestById(requestId: string, ownerId?: string): Promise<Request | null> {
  if (ownerId) {
    return getRequest(ownerId, requestId);
  }

  const q = query(collectionGroup(db, 'requests'), where(documentId(), '==', requestId));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return null;
  }

  const requestDoc = snapshot.docs[0];
  return mapRequest(requestDoc.id, requestDoc.data());
}

/**
 * Get all requests for a user (their own requests)
 */
export async function getUserRequests(ownerId: string): Promise<Request[]> {
  const requestsRef = getUserRequestsRef(ownerId);
  const q = query(requestsRef, orderBy('createdAt', 'desc'));
  const querySnapshot = await getDocs(q);

  const requests: Request[] = [];
  querySnapshot.forEach((requestDoc) => {
    requests.push(mapRequest(requestDoc.id, requestDoc.data()));
  });

  return requests;
}

/**
 * Update a request (only by owner, only if open)
 */
export async function updateRequest(
  ownerId: string,
  requestId: string,
  data: UpdateRequestData
): Promise<void> {
  validateRequestTextFields(data);

  const requestRef = doc(db, 'users', ownerId, 'requests', requestId);
  const requestSnap = await getDoc(requestRef);

  if (!requestSnap.exists()) {
    throw new Error('Request not found');
  }

  const currentData = requestSnap.data();
  if (currentData.status !== 'open') {
    throw new Error('Can only edit open requests');
  }

  const updatePayload: Record<string, unknown> = {};
  const pilotLocation = getPilotLocationPayload();

  // If updating pets, validate ownership
  if (data.petIds) {
    const petIds = data.petIds;
    if (petIds.length === 0) {
      throw new Error('At least one pet must be selected');
    }

    const userPets = await getUserPets(ownerId);
    const validPetIds = userPets.map((p) => p.id);
    const invalidPets = petIds.filter((id) => !validPetIds.includes(id));
    
    if (invalidPets.length > 0) {
      throw new Error('You can only select your own pets');
    }

    // Update pet names
    const selectedPets = userPets.filter((p) => petIds.includes(p.id));
    const petNames = selectedPets.map((p) => p.name);
    updatePayload.petIds = petIds;
    updatePayload.petNames = petNames;
  }

  const effectiveStartDate = data.startDate ?? toDateOrNow(currentData.startDate);
  const effectiveEndDate = data.endDate ?? toDateOrNow(currentData.endDate);
  const creditsOffered = calculateCreditsForRequestWindow(effectiveStartDate, effectiveEndDate);

  if (data.startDate) {
    updatePayload.startDate = Timestamp.fromDate(data.startDate);
  }
  if (data.endDate) {
    updatePayload.endDate = Timestamp.fromDate(data.endDate);
  }
  if (data.careType) {
    updatePayload.careType = data.careType;
  }
  updatePayload.location = pilotLocation.location;
  updatePayload.locationLat = pilotLocation.latitude;
  updatePayload.locationLng = pilotLocation.longitude;
  updatePayload.creditsOffered = creditsOffered;
  if (data.notes !== undefined) {
    updatePayload.notes = data.notes;
  }
  if (data.feedingSchedule !== undefined) {
    updatePayload.feedingSchedule = data.feedingSchedule;
  }
  if (data.walkSchedule !== undefined) {
    updatePayload.walkSchedule = data.walkSchedule;
  }
  if (data.medicationInstructions !== undefined) {
    updatePayload.medicationInstructions = data.medicationInstructions;
  }
  if (data.sleepInstructions !== undefined) {
    updatePayload.sleepInstructions = data.sleepInstructions;
  }
  if (data.specialWarnings !== undefined) {
    updatePayload.specialWarnings = data.specialWarnings;
  }

  await updateDoc(requestRef, {
    ...updatePayload,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Change request status with validation
 */
export async function changeRequestStatus(
  ownerId: string,
  requestId: string,
  newStatus: RequestStatus,
  sitterId?: string,
  sitterName?: string
): Promise<void> {
  const requestRef = doc(db, 'users', ownerId, 'requests', requestId);
  const requestSnap = await getDoc(requestRef);

  if (!requestSnap.exists()) {
    throw new Error('Request not found');
  }

  const currentData = requestSnap.data();
  const currentStatus = currentData.status as RequestStatus;

  if (!isValidStatusTransition(currentStatus, newStatus)) {
    throw new Error(`Cannot transition from ${currentStatus} to ${newStatus}`);
  }

  const updateData: Record<string, unknown> = {
    status: newStatus,
    updatedAt: serverTimestamp(),
  };

  // If accepting, set sitter info
  if (newStatus === 'accepted' && sitterId && sitterName) {
    updateData.sitterId = sitterId;
    updateData.sitterName = sitterName;
  }

  await updateDoc(requestRef, updateData);
}

/**
 * Cancel a request (owner only)
 * - For open requests: simply changes status to cancelled
 * - For accepted requests: use cancelAcceptedRequest instead
 */
export async function cancelRequest(ownerId: string, requestId: string): Promise<void> {
  const requestRef = doc(db, 'users', ownerId, 'requests', requestId);
  const requestSnap = await getDoc(requestRef);

  if (!requestSnap.exists()) {
    throw new Error('Request not found');
  }

  const currentData = requestSnap.data();
  const currentStatus = currentData.status as RequestStatus;

  if (currentStatus === 'accepted') {
    throw new Error('Use cancelAcceptedRequest to cancel an accepted request (requires escrow refund)');
  }

  if (currentStatus !== 'open') {
    throw new Error(`Cannot cancel request with status: ${currentStatus}`);
  }

  await changeRequestStatus(ownerId, requestId, 'cancelled');
}

/**
 * Delete a request (only if open or cancelled)
 */
export async function deleteRequest(ownerId: string, requestId: string): Promise<void> {
  const requestRef = doc(db, 'users', ownerId, 'requests', requestId);
  const requestSnap = await getDoc(requestRef);

  if (!requestSnap.exists()) {
    throw new Error('Request not found');
  }

  const currentData = requestSnap.data();
  if (currentData.status !== 'open' && currentData.status !== 'cancelled') {
    throw new Error('Can only delete open or cancelled requests');
  }

  await deleteDoc(requestRef);
}

/**
 * Get all open requests across all users (for browsing)
 * Uses collection group query to fetch from all users' request subcollections
 * Optionally exclude a specific user's requests
 */
export async function getAllOpenRequests(excludeUserId?: string): Promise<Request[]> {
  try {
    // Collection group query to get all requests across all users
    // Note: Ordering removed to avoid requiring composite index
    const requestsQuery = query(
      collectionGroup(db, 'requests'),
      where('status', '==', 'open')
    );

    const querySnapshot = await getDocs(requestsQuery);
    const requests: Request[] = [];

    querySnapshot.forEach((requestDoc) => {
      const data = requestDoc.data();
      
      // Exclude requests from the specified user if provided
      if (excludeUserId && data.ownerId === excludeUserId) {
        return;
      }

       if (resolveAudience(data) === 'direct') {
        return;
      }

      if (normalizeCity((data.location as string) || '') !== normalizeCity(PILOT_CITY)) {
        return;
      }

      requests.push(mapRequest(requestDoc.id, data));
    });

    // Sort in JavaScript since we removed Firestore ordering
    requests.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return requests;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching open requests:', error);
    throw new Error('Failed to fetch open requests: ' + message);
  }
}

export async function getDirectRequestsForSitter(sitterId: string): Promise<Request[]> {
  try {
    const requestsQuery = query(
      collectionGroup(db, 'requests'),
      where('requestedSitterId', '==', sitterId)
    );

    const querySnapshot = await getDocs(requestsQuery);
    const requests: Request[] = [];

    querySnapshot.forEach((requestDoc) => {
      const data = requestDoc.data();
      const mappedRequest = mapRequest(requestDoc.id, data);

      if (mappedRequest.status !== 'open') {
        return;
      }

      if (mappedRequest.audience !== 'direct') {
        return;
      }

      requests.push(mappedRequest);
    });

    requests.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return requests;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching direct requests:', error);
    throw new Error('Failed to fetch direct requests: ' + message);
  }
}

/**
 * Get all requests where the user is the assigned sitter
 * Used for "Jobs I'm helping with" view
 */
export async function getSitterRequests(sitterId: string): Promise<Request[]> {
  try {
    // Collection group query to get all requests where user is the sitter
    const requestsQuery = query(
      collectionGroup(db, 'requests'),
      where('sitterId', '==', sitterId)
    );

    const querySnapshot = await getDocs(requestsQuery);
    const requests: Request[] = [];

    querySnapshot.forEach((requestDoc) => {
      requests.push(mapRequest(requestDoc.id, requestDoc.data()));
    });

    // Sort by date
    requests.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return requests;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching sitter requests:', error);
    throw new Error('Failed to fetch sitter requests: ' + message);
  }
}

/**
 * Apply to an open request.
 * Sitter must not be owner and must be marked available in profile.
 */
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

  const requestRef = doc(db, 'users', ownerId, 'requests', requestId);
  const requestSnap = await getDoc(requestRef);
  if (!requestSnap.exists()) {
    throw new Error('Request not found');
  }

  const requestData = requestSnap.data();
  const requestAudience = resolveAudience(requestData);
  const requestedSitterId = (requestData.requestedSitterId as string) || '';

  if (requestAudience === 'direct' && requestedSitterId && requestedSitterId !== sitterId) {
    throw new Error('This direct request was sent to another sitter.');
  }

  const requestStartAt = toDateOrNow(requestData.startDate);
  const requestEndAt = toDateOrNow(requestData.endDate);
  const availabilityMatch = await getAvailabilityMatch(sitterId, requestStartAt, requestEndAt);
  if (!availabilityMatch.available) {
    if (availabilityMatch.hasConflict) {
      throw new Error('You already have another confirmed booking during these dates');
    }
    throw new Error('Add an availability slot that fully covers these dates before applying');
  }

  await runTransaction(db, async (transaction) => {
    const liveRequestSnap = await transaction.get(requestRef);
    if (!liveRequestSnap.exists()) {
      throw new Error('Request not found');
    }

    const liveRequestData = liveRequestSnap.data();
    const status = liveRequestData.status as RequestStatus;
    if (status !== 'open') {
      throw new Error('This request is no longer open');
    }

    const applications = parseApplications(liveRequestData.applications);
    const alreadyApplied = applications.some((application) => application.sitterId === sitterId);
    if (alreadyApplied) {
      throw new Error('You have already applied to this request');
    }

    applications.push({
      sitterId,
      sitterName: sitterProfile.name,
      message,
      appliedAt: new Date(),
    });

    transaction.update(requestRef, {
      applications: applications.map((application) => ({
        ...application,
        appliedAt: Timestamp.fromDate(application.appliedAt),
      })),
      updatedAt: serverTimestamp(),
    });
  });

  await ensureConversation(ownerId, requestId, sitterId, sitterProfile.name);
  await createNotification({
    userId: ownerId,
    type: 'application_received',
    relatedRequestId: requestId,
    message: `${sitterProfile.name} applied to your request.`,
  });
}

/**
 * Withdraw a sitter application from an open request.
 */
export async function withdrawApplication(
  ownerId: string,
  requestId: string,
  sitterId: string
): Promise<void> {
  const requestRef = doc(db, 'users', ownerId, 'requests', requestId);

  await runTransaction(db, async (transaction) => {
    const requestSnap = await transaction.get(requestRef);
    if (!requestSnap.exists()) {
      throw new Error('Request not found');
    }

    const requestData = requestSnap.data();
    const status = requestData.status as RequestStatus;
    if (status !== 'open') {
      throw new Error('Cannot withdraw application after request is no longer open');
    }

    const applications = parseApplications(requestData.applications);
    const nextApplications = applications.filter((application) => application.sitterId !== sitterId);

    if (nextApplications.length === applications.length) {
      throw new Error('Application not found');
    }

    transaction.update(requestRef, {
      applications: nextApplications.map((application) => ({
        ...application,
        appliedAt: Timestamp.fromDate(application.appliedAt),
      })),
      updatedAt: serverTimestamp(),
    });
  });
}

/**
 * Owner accepts one applicant.
 * Marks request accepted and escrows credits.
 */
export async function acceptApplication(
  ownerId: string,
  requestId: string,
  sitterId: string
): Promise<void> {
  const requestRef = doc(db, 'users', ownerId, 'requests', requestId);
  const ownerWalletRef = getWalletRef(ownerId);
  const ownerTransactionsRef = getWalletTransactionsRef(ownerId);
  let selectedSitterName = 'Sitter';
  let ownerName = 'Owner';
  let offeredCredits = 0;
  const requestSnap = await getDoc(requestRef);
  if (!requestSnap.exists()) {
    throw new Error('Request not found');
  }
  const requestData = requestSnap.data();
  const availabilityMatch = await getAvailabilityMatch(
    sitterId,
    toDateOrNow(requestData.startDate),
    toDateOrNow(requestData.endDate)
  );
  if (!availabilityMatch.available) {
    if (availabilityMatch.hasConflict) {
      throw new Error('This sitter already has another confirmed booking during these dates');
    }
    throw new Error('This sitter no longer has an availability slot covering these dates');
  }

  await runTransaction(db, async (transaction) => {
    const requestSnap = await transaction.get(requestRef);
    if (!requestSnap.exists()) {
      throw new Error('Request not found');
    }

    const requestData = requestSnap.data();
    const status = requestData.status as RequestStatus;
    ownerName = (requestData.ownerName as string) || 'Owner';

    if (status !== 'open') {
      throw new Error('Request is no longer open');
    }

    const applications = parseApplications(requestData.applications);
    const selectedApplication = applications.find((application) => application.sitterId === sitterId);

    if (!selectedApplication) {
      throw new Error('Selected sitter has not applied');
    }

    selectedSitterName = selectedApplication.sitterName;
    offeredCredits = asNumber(requestData.creditsOffered) || 0;
    if (offeredCredits <= 0) {
      throw new Error('Invalid credits offered');
    }

    const ownerWalletSnap = await transaction.get(ownerWalletRef);
    if (!ownerWalletSnap.exists()) {
      throw new Error('Owner wallet not found');
    }
    const currentBalance = asNumber(ownerWalletSnap.data().balance) || 0;
    if (currentBalance < offeredCredits) {
      throw new Error(
        `Insufficient credits. You have ${currentBalance} credits but need ${offeredCredits}.`
      );
    }
    const newBalance = currentBalance - offeredCredits;

    transaction.update(requestRef, {
      status: 'accepted',
      escrowStatus: 'held',
      sitterId,
      sitterName: selectedSitterName,
      applications: [],
      updatedAt: serverTimestamp(),
    });

    transaction.update(ownerWalletRef, {
      balance: newBalance,
      lastRequestId: requestId,
      lastRequestOwnerId: ownerId,
      lastWalletAction: 'escrow_hold',
      updatedAt: serverTimestamp(),
    });

    const txRef = doc(ownerTransactionsRef);
    transaction.set(
      txRef,
      createWalletTransactionPayload(
        'escrow',
        offeredCredits,
        `Escrow for request ${requestId}`,
        requestId,
        newBalance
      )
    );
  });

  await ensureConversation(ownerId, requestId, sitterId, selectedSitterName);
  await createNotification({
    userId: sitterId,
    type: 'application_accepted',
    relatedRequestId: requestId,
    message: `Your application was accepted by ${ownerName}.`,
  });
}

/**
 * Accept a request by a non-owner user
 * - Validates request is open and sitter is not owner
 * - Puts credits into escrow (deducts from owner wallet)
 * - Assigns sitterId and changes status to accepted
 * - All operations are atomic using Firestore transaction
 */
export async function acceptRequest(
  ownerId: string,
  requestId: string,
  sitterId: string
): Promise<void> {
  if (ownerId === sitterId) {
    throw new Error('You cannot accept your own request');
  }

  try {
    await applyToRequest(ownerId, requestId, sitterId, 'Auto-applied during direct acceptance');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (!message.includes('already applied')) {
      throw error;
    }
  }

  await acceptApplication(ownerId, requestId, sitterId);
}

/**
 * Mark request as awaiting confirmation (sitter only)
 * - Validates request is accepted
 * - Only sitter can mark as awaiting confirmation
 * - Changes status to awaiting_confirmation
 * - Credits remain in escrow
 */
export async function markAwaitingConfirmation(
  ownerId: string,
  requestId: string,
  sitterId: string
): Promise<void> {
  const requestRef = doc(db, 'users', ownerId, 'requests', requestId);

  // Use Firestore transaction to update status
  await runTransaction(db, async (transaction) => {
    const requestSnap = await transaction.get(requestRef);

    if (!requestSnap.exists()) {
      throw new Error('Request not found');
    }

    const requestData = requestSnap.data();
    const currentStatus = requestData.status as RequestStatus;
    const assignedSitterId = requestData.sitterId;
    const escrowStatus = requestData.escrowStatus || 'none';

    // Validate status
    if (currentStatus !== 'accepted') {
      throw new Error(`Cannot mark request with status ${currentStatus} as awaiting confirmation`);
    }
    if (escrowStatus !== 'held') {
      throw new Error('Escrow must be held before moving to awaiting confirmation');
    }

    // Validate sitter
    if (assignedSitterId !== sitterId) {
      throw new Error('Only the assigned sitter can mark this request as awaiting confirmation');
    }

    // Update request to awaiting_confirmation
    transaction.update(requestRef, {
      status: 'awaiting_confirmation',
      markedCompleteAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });

  await createNotification({
    userId: ownerId,
    type: 'request_completed',
    relatedRequestId: requestId,
    message: 'The sitter marked this task as complete. Please confirm to release credits.',
  });
}

/**
 * Confirm completion and release escrow (owner only)
 * - Validates request is awaiting_confirmation
 * - Only owner can confirm completion
 * - Releases escrow to sitter wallet
 * - Changes status to completed
 * - All operations are atomic
 */
export async function confirmCompletion(
  ownerId: string,
  requestId: string,
  confirmedBy?: string
): Promise<void> {
  if (confirmedBy && confirmedBy !== ownerId) {
    throw new Error('Only the request owner can confirm completion');
  }

  const requestRef = doc(db, 'users', ownerId, 'requests', requestId);
  let sitterId = '';

  await runTransaction(db, async (transaction) => {
    const requestSnap = await transaction.get(requestRef);
    if (!requestSnap.exists()) {
      throw new Error('Request not found');
    }

    const requestData = requestSnap.data();
    const currentStatus = requestData.status as RequestStatus;
    const assignedSitterId = requestData.sitterId as string | undefined;
    const creditsOffered = asNumber(requestData.creditsOffered) || 0;
    const escrowStatus = requestData.escrowStatus || 'none';

    if (currentStatus !== 'awaiting_confirmation') {
      throw new Error(`Cannot confirm completion for request with status: ${currentStatus}`);
    }
    if (escrowStatus !== 'held') {
      throw new Error('Escrow status mismatch: expected held before completion');
    }
    if (!assignedSitterId) {
      throw new Error('No sitter assigned to this request');
    }
    if (creditsOffered <= 0) {
      throw new Error('Invalid credits offered');
    }

    const sitterWalletRef = getWalletRef(assignedSitterId);
    const sitterWalletTransactionsRef = getWalletTransactionsRef(assignedSitterId);
    const sitterWalletSnap = await transaction.get(sitterWalletRef);
    if (!sitterWalletSnap.exists()) {
      throw new Error('Sitter wallet not found');
    }

    const currentSitterBalance = asNumber(sitterWalletSnap.data().balance) || 0;
    const currentDailyEarnedDate =
      typeof sitterWalletSnap.data().dailyEarnedDate === 'string'
        ? (sitterWalletSnap.data().dailyEarnedDate as string)
        : '';
    const currentDailyEarnedCredits =
      currentDailyEarnedDate === getTodayKey()
        ? asNumber(sitterWalletSnap.data().dailyEarnedCredits) || 0
        : 0;

    if (currentDailyEarnedCredits + creditsOffered > MAX_EARNED_CREDITS_PER_DAY) {
      throw new Error(
        `Daily credit limit reached. A sitter can earn up to ${MAX_EARNED_CREDITS_PER_DAY} credits per day.`
      );
    }

    const newSitterBalance = currentSitterBalance + creditsOffered;
    const newDailyEarnedCredits = currentDailyEarnedCredits + creditsOffered;

    transaction.update(sitterWalletRef, {
      balance: newSitterBalance,
      lastRequestId: requestId,
      lastRequestOwnerId: ownerId,
      dailyEarnedDate: getTodayKey(),
      dailyEarnedCredits: newDailyEarnedCredits,
      lastWalletAction: 'escrow_release',
      updatedAt: serverTimestamp(),
    });

    const txRef = doc(sitterWalletTransactionsRef);
    transaction.set(
      txRef,
      createWalletTransactionPayload(
        'escrow-release',
        creditsOffered,
        `Credits released for completed request ${requestId}`,
        requestId,
        newSitterBalance
      )
    );

    transaction.update(requestRef, {
      status: 'completed',
      escrowStatus: 'released',
      confirmedCompleteAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    sitterId = assignedSitterId;
  });

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
    await recalculateTrustScore(sitterId);
  } catch (error) {
    console.warn('Unable to refresh sitter trust score after completion:', error);
  }

  await logRepeatedPairActivity(ownerId, sitterId, requestId);
}

/**
 * Cancel an accepted request with escrow refund
 * - Validates request is accepted or awaiting_confirmation
 * - Refunds escrow back to owner wallet
 * - Changes status to cancelled
 * - All operations are atomic
 */
export async function cancelAcceptedRequest(
  ownerId: string,
  requestId: string,
  cancelledBy: string
): Promise<void> {
  const requestRef = doc(db, 'users', ownerId, 'requests', requestId);
  const ownerWalletRef = getWalletRef(ownerId);
  const ownerTransactionsRef = getWalletTransactionsRef(ownerId);

  await runTransaction(db, async (transaction) => {
    const requestSnap = await transaction.get(requestRef);
    if (!requestSnap.exists()) {
      throw new Error('Request not found');
    }

    const requestData = requestSnap.data();
    const currentStatus = requestData.status as RequestStatus;
    const sitterId = requestData.sitterId as string | undefined;
    const creditsOffered = asNumber(requestData.creditsOffered) || 0;
    const escrowStatus = requestData.escrowStatus || 'none';

    if (currentStatus !== 'accepted' && currentStatus !== 'awaiting_confirmation') {
      throw new Error(
        `Cannot cancel request with status: ${currentStatus}. Use cancelRequest for open requests.`
      );
    }
    if (escrowStatus !== 'held') {
      throw new Error('Escrow status mismatch: expected held before refund');
    }
    if (!sitterId) {
      throw new Error('No sitter assigned to this request');
    }
    if (cancelledBy !== ownerId && cancelledBy !== sitterId) {
      throw new Error('Only owner or assigned sitter can cancel the request');
    }
    if (creditsOffered <= 0) {
      throw new Error('Invalid credits offered');
    }

    const ownerWalletSnap = await transaction.get(ownerWalletRef);
    if (!ownerWalletSnap.exists()) {
      throw new Error('Owner wallet not found');
    }

    const currentBalance = asNumber(ownerWalletSnap.data().balance) || 0;
    const newBalance = currentBalance + creditsOffered;

    transaction.update(ownerWalletRef, {
      balance: newBalance,
      lastRequestId: requestId,
      lastRequestOwnerId: ownerId,
      lastWalletAction: 'escrow_refund',
      updatedAt: serverTimestamp(),
    });

    const txRef = doc(ownerTransactionsRef);
    transaction.set(
      txRef,
      createWalletTransactionPayload(
        'escrow-refund',
        creditsOffered,
        `Refund for cancelled request ${requestId}`,
        requestId,
        newBalance
      )
    );

    transaction.update(requestRef, {
      status: 'cancelled',
      escrowStatus: 'refunded',
      updatedAt: serverTimestamp(),
    });
  });
}

/**
 * Owner submits review/rating for completed request.
 * One review per request.
 */
export async function submitReview(
  ownerId: string,
  requestId: string,
  rating: number,
  comment: string
): Promise<void> {
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    throw new Error('Rating must be between 1 and 5');
  }

  const requestRef = doc(db, 'users', ownerId, 'requests', requestId);
  const reviewComment = comment.trim();

  let reviewedSitterId = '';
  let shouldRefreshTrustScore = false;

  await runTransaction(db, async (transaction) => {
    const requestSnap = await transaction.get(requestRef);
    if (!requestSnap.exists()) {
      throw new Error('Request not found');
    }

    const requestData = requestSnap.data();
    const status = requestData.status as RequestStatus;
    const sitterId = requestData.sitterId as string | undefined;
    const ownerName = requestData.ownerName as string;

    if (status !== 'completed') {
      throw new Error('You can review only completed requests');
    }
    if (!sitterId) {
      throw new Error('No sitter assigned for this request');
    }
    if (requestData.review) {
      throw new Error('This request already has a review');
    }

    const publicSitterProfileRef = doc(db, 'publicProfiles', sitterId);
    const publicSitterProfileSnap = await transaction.get(publicSitterProfileRef);
    if (!publicSitterProfileSnap.exists()) {
      throw new Error('Sitter public profile not found');
    }

    const sitterData = publicSitterProfileSnap.data();
    const currentCount = asNumber(sitterData.ratingCount) || 0;
    const currentAverage = asNumber(sitterData.ratingAverage) || 0;
    const nextCount = currentCount + 1;
    const nextAverage = (currentAverage * currentCount + rating) / nextCount;
    const privateSitterProfileRef = doc(db, 'users', sitterId);

    transaction.update(requestRef, {
      review: {
        rating,
        comment: reviewComment,
        reviewerId: ownerId,
        reviewerName: ownerName || 'Owner',
        reviewedAt: serverTimestamp(),
      },
      updatedAt: serverTimestamp(),
    });

    transaction.update(privateSitterProfileRef, {
      ratingCount: nextCount,
      ratingAverage: nextAverage,
      lastReviewOwnerId: ownerId,
      lastReviewRequestId: requestId,
      updatedAt: serverTimestamp(),
    });

    transaction.update(publicSitterProfileRef, {
      ratingCount: nextCount,
      ratingAverage: nextAverage,
      updatedAt: serverTimestamp(),
    });

    reviewedSitterId = sitterId;
    shouldRefreshTrustScore = true;
  });

  if (reviewedSitterId) {
    await createNotification({
      userId: reviewedSitterId,
      type: 'review_received',
      relatedRequestId: requestId,
      message: 'You received a new review.',
    });
    if (shouldRefreshTrustScore) {
      try {
        await recalculateTrustScore(reviewedSitterId);
      } catch (error) {
        console.warn('Unable to refresh sitter trust score after review:', error);
      }
    }
  }
}

/**
 * Fetch all completed reviewed jobs for a sitter.
 */
export async function getSitterReviews(sitterId: string): Promise<RequestReview[]> {
  const requestsQuery = query(
    collectionGroup(db, 'requests'),
    where('sitterId', '==', sitterId)
  );

  const querySnapshot = await getDocs(requestsQuery);
  const reviews: RequestReview[] = [];

  querySnapshot.forEach((requestDoc) => {
    const data = requestDoc.data();
    if (data.status !== 'completed' || !data.review) {
      return;
    }

    const review = parseReview(data.review);
    if (review) {
      reviews.push(review);
    }
  });

  reviews.sort((a, b) => b.reviewedAt.getTime() - a.reviewedAt.getTime());
  return reviews;
}
