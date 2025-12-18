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
  limit,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { Request, CreateRequestData, UpdateRequestData, RequestStatus } from '@/types/request';
import { getUserPets } from './petService';
import { getProfile } from './profileService';

/**
 * Get requests collection reference for a user
 */
function getUserRequestsRef(userId: string) {
  return collection(db, 'users', userId, 'requests');
}

/**
 * Validate status transition
 */
function isValidStatusTransition(currentStatus: RequestStatus, newStatus: RequestStatus): boolean {
  const validTransitions: Record<RequestStatus, RequestStatus[]> = {
    open: ['accepted', 'cancelled'],
    accepted: ['completed', 'cancelled'],
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

  if (data.creditsOffered <= 0) {
    throw new Error('Credits offered must be positive');
  }

  if (data.endDate <= data.startDate) {
    throw new Error('End date must be after start date');
  }

  // Get owner profile for name
  const ownerProfile = await getProfile(ownerId);
  if (!ownerProfile) {
    throw new Error('Owner profile not found');
  }

  // Get pet names
  const selectedPets = userPets.filter((p) => data.petIds.includes(p.id));
  const petNames = selectedPets.map((p) => p.name);

  const requestsRef = getUserRequestsRef(ownerId);
  const docRef = await addDoc(requestsRef, {
    ownerId,
    ownerName: ownerProfile.name,
    petIds: data.petIds,
    petNames,
    careType: data.careType,
    startDate: Timestamp.fromDate(data.startDate),
    endDate: Timestamp.fromDate(data.endDate),
    location: data.location,
    creditsOffered: data.creditsOffered,
    status: 'open',
    notes: data.notes || '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

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
  return {
    id: requestSnap.id,
    ownerId: data.ownerId,
    ownerName: data.ownerName,
    petIds: data.petIds,
    petNames: data.petNames,
    careType: data.careType,
    startDate: data.startDate?.toDate() || new Date(),
    endDate: data.endDate?.toDate() || new Date(),
    location: data.location,
    creditsOffered: data.creditsOffered,
    status: data.status,
    sitterId: data.sitterId,
    sitterName: data.sitterName,
    notes: data.notes,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
  };
}

/**
 * Get all requests for a user (their own requests)
 */
export async function getUserRequests(ownerId: string): Promise<Request[]> {
  const requestsRef = getUserRequestsRef(ownerId);
  const q = query(requestsRef, orderBy('createdAt', 'desc'));
  const querySnapshot = await getDocs(q);

  const requests: Request[] = [];
  querySnapshot.forEach((doc) => {
    const data = doc.data();
    requests.push({
      id: doc.id,
      ownerId: data.ownerId,
      ownerName: data.ownerName,
      petIds: data.petIds,
      petNames: data.petNames,
      careType: data.careType,
      startDate: data.startDate?.toDate() || new Date(),
      endDate: data.endDate?.toDate() || new Date(),
      location: data.location,
      creditsOffered: data.creditsOffered,
      status: data.status,
      sitterId: data.sitterId,
      sitterName: data.sitterName,
      notes: data.notes,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    });
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
  const requestRef = doc(db, 'users', ownerId, 'requests', requestId);
  const requestSnap = await getDoc(requestRef);

  if (!requestSnap.exists()) {
    throw new Error('Request not found');
  }

  const currentData = requestSnap.data();
  if (currentData.status !== 'open') {
    throw new Error('Can only edit open requests');
  }

  // If updating pets, validate ownership
  if (data.petIds) {
    const userPets = await getUserPets(ownerId);
    const validPetIds = userPets.map((p) => p.id);
    const invalidPets = data.petIds.filter((id) => !validPetIds.includes(id));
    
    if (invalidPets.length > 0) {
      throw new Error('You can only select your own pets');
    }

    // Update pet names
    const selectedPets = userPets.filter((p) => data.petIds!.includes(p.id));
    const petNames = selectedPets.map((p) => p.name);
    (data as any).petNames = petNames;
  }

  // Validate dates if provided
  if (data.startDate && data.endDate && data.endDate <= data.startDate) {
    throw new Error('End date must be after start date');
  }

  // Convert dates to Timestamps if provided
  const updateData: any = { ...data };
  if (data.startDate) {
    updateData.startDate = Timestamp.fromDate(data.startDate);
  }
  if (data.endDate) {
    updateData.endDate = Timestamp.fromDate(data.endDate);
  }

  await updateDoc(requestRef, {
    ...updateData,
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

  const updateData: any = {
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
 */
export async function cancelRequest(ownerId: string, requestId: string): Promise<void> {
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
 * NOTE: This requires a collection group query or manual aggregation
 * For now, returning empty - will implement when needed
 */
export async function getAllOpenRequests(): Promise<Request[]> {
  // TODO: Implement collection group query or aggregation
  // For MVP, users will need to share request IDs directly
  return [];
}
