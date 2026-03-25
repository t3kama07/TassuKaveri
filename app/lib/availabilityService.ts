import {
  addDoc,
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  AvailabilityMatchResult,
  AvailabilitySlot,
  CreateAvailabilitySlotData,
} from '@/types/availability';
import { syncPublicAvailabilitySummary } from './publicProfileService';

const AVAILABILITY_SLOTS_COLLECTION = 'availabilitySlots';

function getAvailabilitySlotsRef(userId: string) {
  return collection(db, 'users', userId, AVAILABILITY_SLOTS_COLLECTION);
}

function toDate(value: unknown): Date {
  if (value instanceof Timestamp) {
    return value.toDate();
  }
  if (value instanceof Date) {
    return value;
  }
  if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
    return value.toDate();
  }
  return new Date();
}

function mapAvailabilitySlot(
  userId: string,
  id: string,
  data: Record<string, unknown>
): AvailabilitySlot {
  return {
    id,
    userId,
    startAt: toDate(data.startAt),
    endAt: toDate(data.endAt),
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

function isSameLocalDay(firstDate: Date, secondDate: Date): boolean {
  return (
    firstDate.getFullYear() === secondDate.getFullYear()
    && firstDate.getMonth() === secondDate.getMonth()
    && firstDate.getDate() === secondDate.getDate()
  );
}

export function isSingleDayAvailabilitySlot(
  slot: Pick<AvailabilitySlot, 'startAt' | 'endAt'>
): boolean {
  return isSameLocalDay(slot.startAt, slot.endAt);
}

function validateAvailabilitySlotData(data: CreateAvailabilitySlotData): void {
  if (data.endAt.getTime() <= data.startAt.getTime()) {
    throw new Error('End time must be after start time');
  }

  if (data.startAt.getTime() <= Date.now()) {
    throw new Error('Start time must be in the future');
  }
}

function ensureAvailabilityDoesNotOverlap(
  ranges: CreateAvailabilitySlotData[],
  existingSlots: AvailabilitySlot[]
): void {
  const sortedRanges = [...ranges].sort((left, right) => left.startAt.getTime() - right.startAt.getTime());

  for (let index = 0; index < sortedRanges.length; index += 1) {
    const currentRange = sortedRanges[index];
    const previousRange = sortedRanges[index - 1];

    if (
      previousRange
      && rangesOverlap(
        previousRange.startAt,
        previousRange.endAt,
        currentRange.startAt,
        currentRange.endAt
      )
    ) {
      throw new Error('Your saved time slots for this day overlap each other');
    }

    const overlappingSlot = existingSlots.find((slot) =>
      rangesOverlap(slot.startAt, slot.endAt, currentRange.startAt, currentRange.endAt)
    );

    if (overlappingSlot) {
      throw new Error('This time overlaps one of your existing availability slots');
    }
  }
}

export function doesSlotCoverRange(slot: AvailabilitySlot, startAt: Date, endAt: Date): boolean {
  return slot.startAt.getTime() <= startAt.getTime() && slot.endAt.getTime() >= endAt.getTime();
}

export function rangesOverlap(
  firstStartAt: Date,
  firstEndAt: Date,
  secondStartAt: Date,
  secondEndAt: Date
): boolean {
  return firstStartAt.getTime() < secondEndAt.getTime() && secondStartAt.getTime() < firstEndAt.getTime();
}

export function getUpcomingAvailabilitySlots(
  slots: AvailabilitySlot[],
  referenceDate: Date = new Date()
): AvailabilitySlot[] {
  return slots
    .filter((slot) => slot.endAt.getTime() >= referenceDate.getTime())
    .sort((left, right) => left.startAt.getTime() - right.startAt.getTime());
}

export async function getAvailabilitySlots(userId: string): Promise<AvailabilitySlot[]> {
  const slotsQuery = query(getAvailabilitySlotsRef(userId), orderBy('startAt', 'asc'));
  const snapshot = await getDocs(slotsQuery);

  const slots: AvailabilitySlot[] = [];
  snapshot.forEach((slotDoc) => {
    slots.push(mapAvailabilitySlot(userId, slotDoc.id, slotDoc.data()));
  });

  return slots;
}

export async function createAvailabilitySlot(
  userId: string,
  data: CreateAvailabilitySlotData
): Promise<string> {
  validateAvailabilitySlotData(data);

  const existingSlots = await getAvailabilitySlots(userId);
  ensureAvailabilityDoesNotOverlap([data], existingSlots);

  const docRef = await addDoc(getAvailabilitySlotsRef(userId), {
    startAt: Timestamp.fromDate(data.startAt),
    endAt: Timestamp.fromDate(data.endAt),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await syncPublicAvailabilitySummary(
    userId,
    getUpcomingAvailabilitySlots([...existingSlots, mapAvailabilitySlot(userId, docRef.id, {
      startAt: Timestamp.fromDate(data.startAt),
      endAt: Timestamp.fromDate(data.endAt),
      createdAt: data.startAt,
      updatedAt: data.startAt,
    })])
  );

  return docRef.id;
}

export async function deleteAvailabilitySlot(userId: string, slotId: string): Promise<void> {
  const slotRef = doc(db, 'users', userId, AVAILABILITY_SLOTS_COLLECTION, slotId);
  await deleteDoc(slotRef);
  await syncPublicAvailabilitySummary(userId, getUpcomingAvailabilitySlots(await getAvailabilitySlots(userId)));
}

export async function updateAvailabilitySlot(
  userId: string,
  slotId: string,
  data: CreateAvailabilitySlotData
): Promise<void> {
  validateAvailabilitySlotData(data);

  const existingSlots = await getAvailabilitySlots(userId);
  const remainingSlots = existingSlots.filter((slot) => slot.id !== slotId);
  ensureAvailabilityDoesNotOverlap([data], remainingSlots);

  const slotRef = doc(db, 'users', userId, AVAILABILITY_SLOTS_COLLECTION, slotId);
  await updateDoc(slotRef, {
    startAt: Timestamp.fromDate(data.startAt),
    endAt: Timestamp.fromDate(data.endAt),
    updatedAt: serverTimestamp(),
  });
  await syncPublicAvailabilitySummary(userId, getUpcomingAvailabilitySlots(await getAvailabilitySlots(userId)));
}

export async function replaceAvailabilitySlotsForDay(
  userId: string,
  day: Date,
  ranges: CreateAvailabilitySlotData[]
): Promise<void> {
  ranges.forEach((range) => {
    validateAvailabilitySlotData(range);

    if (!isSingleDayAvailabilitySlot(range) || !isSameLocalDay(range.startAt, day)) {
      throw new Error('Day planner slots must start and end on the selected date');
    }
  });

  const existingSlots = await getAvailabilitySlots(userId);
  const editableSlots = existingSlots.filter(
    (slot) =>
      slot.startAt.getTime() > Date.now()
      && isSingleDayAvailabilitySlot(slot)
      && isSameLocalDay(slot.startAt, day)
  );
  const remainingSlots = existingSlots.filter(
    (slot) => !editableSlots.some((editableSlot) => editableSlot.id === slot.id)
  );

  ensureAvailabilityDoesNotOverlap(ranges, remainingSlots);

  if (editableSlots.length === 0 && ranges.length === 0) {
    return;
  }

  const batch = writeBatch(db);

  editableSlots.forEach((slot) => {
    batch.delete(doc(db, 'users', userId, AVAILABILITY_SLOTS_COLLECTION, slot.id));
  });

  ranges.forEach((range) => {
    const slotRef = doc(getAvailabilitySlotsRef(userId));
    batch.set(slotRef, {
      startAt: Timestamp.fromDate(range.startAt),
      endAt: Timestamp.fromDate(range.endAt),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });

  await batch.commit();
  await syncPublicAvailabilitySummary(userId, getUpcomingAvailabilitySlots(await getAvailabilitySlots(userId)));
}

async function hasActiveRequestConflict(userId: string, startAt: Date, endAt: Date): Promise<boolean> {
  const requestsQuery = query(collectionGroup(db, 'requests'), where('sitterId', '==', userId));
  const snapshot = await getDocs(requestsQuery);

  let conflictFound = false;

  snapshot.forEach((requestDoc) => {
    if (conflictFound) {
      return;
    }

    const data = requestDoc.data();
    const status = typeof data.status === 'string' ? data.status : '';
    if (status !== 'accepted' && status !== 'awaiting_confirmation') {
      return;
    }

    const requestStartAt = toDate(data.startDate);
    const requestEndAt = toDate(data.endDate);
    if (rangesOverlap(requestStartAt, requestEndAt, startAt, endAt)) {
      conflictFound = true;
    }
  });

  return conflictFound;
}

export async function getAvailabilityMatch(
  userId: string,
  startAt: Date,
  endAt: Date,
  existingSlots?: AvailabilitySlot[]
): Promise<AvailabilityMatchResult> {
  if (endAt.getTime() <= startAt.getTime()) {
    throw new Error('End time must be after start time');
  }

  const slots = existingSlots ?? (await getAvailabilitySlots(userId));
  const matchingSlots = getUpcomingAvailabilitySlots(slots).filter((slot) => doesSlotCoverRange(slot, startAt, endAt));

  if (matchingSlots.length === 0) {
    return {
      available: false,
      matchingSlots: [],
      hasConflict: false,
    };
  }

  const hasConflict = await hasActiveRequestConflict(userId, startAt, endAt);
  return {
    available: !hasConflict,
    matchingSlots,
    hasConflict,
  };
}
