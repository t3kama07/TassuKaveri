import {
  addDoc,
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import { ReportRecord } from '@/types/moderation';
import { getProfile, recalculateTrustScore } from './profileService';

function getReportsRef() {
  return collection(db, 'reports');
}

async function assertAdmin(adminId: string): Promise<void> {
  const adminProfile = await getProfile(adminId);
  if (!adminProfile || adminProfile.role !== 'admin') {
    throw new Error('Admin access required');
  }
}

export async function reportUser(reporterId: string, targetUserId: string, reason: string): Promise<void> {
  const trimmedReason = reason.trim();
  if (!trimmedReason) {
    throw new Error('Reason is required');
  }
  if (reporterId === targetUserId) {
    throw new Error('You cannot report your own account');
  }

  await addDoc(getReportsRef(), {
    reporterId,
    type: 'user',
    targetUserId,
    reason: trimmedReason,
    status: 'open',
    createdAt: serverTimestamp(),
  });
}

export async function reportRequest(
  reporterId: string,
  targetOwnerId: string,
  targetRequestId: string,
  reason: string
): Promise<void> {
  const trimmedReason = reason.trim();
  if (!trimmedReason) {
    throw new Error('Reason is required');
  }
  if (!targetOwnerId.trim() || !targetRequestId.trim()) {
    throw new Error('Target request is required');
  }

  await addDoc(getReportsRef(), {
    reporterId,
    type: 'request',
    targetOwnerId,
    targetRequestId,
    reason: trimmedReason,
    status: 'open',
    createdAt: serverTimestamp(),
  });
}

export async function viewReportedUsers(adminId: string): Promise<ReportRecord[]> {
  await assertAdmin(adminId);
  const q = query(
    getReportsRef(),
    where('type', '==', 'user'),
    where('status', '==', 'open'),
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(q);
  const reports: ReportRecord[] = [];

  snapshot.forEach((reportDoc) => {
    const data = reportDoc.data();
    reports.push({
      id: reportDoc.id,
      reporterId: data.reporterId,
      type: data.type,
      targetUserId: data.targetUserId,
      reason: data.reason,
      status: data.status,
      createdAt: data.createdAt?.toDate() || new Date(),
    });
  });

  return reports;
}

export async function viewSuspiciousActivity(adminId: string): Promise<ReportRecord[]> {
  await assertAdmin(adminId);

  const q = query(getReportsRef(), where('status', '==', 'open'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  const reports: ReportRecord[] = [];

  snapshot.forEach((reportDoc) => {
    const data = reportDoc.data();
    reports.push({
      id: reportDoc.id,
      reporterId: data.reporterId,
      type: data.type,
      targetUserId: data.targetUserId,
      targetOwnerId: data.targetOwnerId,
      targetRequestId: data.targetRequestId,
      reason: data.reason,
      status: data.status,
      createdAt: data.createdAt?.toDate() || new Date(),
    });
  });

  return reports;
}

export async function freezeAccount(adminId: string, targetUserId: string, reason: string): Promise<void> {
  await assertAdmin(adminId);

  const userRef = doc(db, 'users', targetUserId);
  await updateDoc(userRef, {
    frozen: true,
    freezeReason: reason || 'Admin action',
    updatedAt: serverTimestamp(),
  });
}

async function recalculateSitterRating(sitterId: string): Promise<void> {
  const q = query(collectionGroup(db, 'requests'), where('sitterId', '==', sitterId));
  const snapshot = await getDocs(q);

  let reviewCount = 0;
  let ratingSum = 0;

  snapshot.forEach((requestDoc) => {
    const data = requestDoc.data();
    const review = data.review as { rating?: number } | undefined;
    if (data.status === 'completed' && review && typeof review.rating === 'number') {
      reviewCount += 1;
      ratingSum += review.rating;
    }
  });

  const average = reviewCount > 0 ? ratingSum / reviewCount : 0;
  const sitterRef = doc(db, 'users', sitterId);
  await updateDoc(sitterRef, {
    ratingCount: reviewCount,
    ratingAverage: average,
    updatedAt: serverTimestamp(),
  });
  await recalculateTrustScore(sitterId);
}

export async function deleteAbusiveReview(
  adminId: string,
  ownerId: string,
  requestId: string
): Promise<void> {
  await assertAdmin(adminId);

  const requestRef = doc(db, 'users', ownerId, 'requests', requestId);
  const requestSnap = await getDoc(requestRef);
  if (!requestSnap.exists()) {
    throw new Error('Request not found');
  }

  const requestData = requestSnap.data();
  const sitterId = requestData.sitterId as string | undefined;
  if (!requestData.review) {
    return;
  }

  await updateDoc(requestRef, {
    review: null,
    reviewRemovedByAdmin: true,
    updatedAt: serverTimestamp(),
  });

  if (sitterId) {
    await recalculateSitterRating(sitterId);
  }
}
