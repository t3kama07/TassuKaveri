import {
  AvailabilityMatchResult,
  AvailabilitySlot,
  CreateAvailabilitySlotData,
} from '@/types/availability';
import { syncPublicAvailabilitySummary } from './publicProfileService';
import { replaceAvailabilitySlotsInSupabase as mirrorAvailabilitySlotsToSupabase } from './supabaseMirrorClient';
import { fetchSupabaseReadJson } from './supabaseReadClient';

function generateAvailabilitySlotId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function toDate(value: unknown): Date {
  if (value instanceof Date) {
    return value;
  }
  if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
    return value.toDate();
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
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

function sortSlots(slots: AvailabilitySlot[]): AvailabilitySlot[] {
  return [...slots].sort((left, right) => left.startAt.getTime() - right.startAt.getTime());
}

function isSameLocalDay(firstDate: Date, secondDate: Date): boolean {
  return (
    firstDate.getFullYear() === secondDate.getFullYear() &&
    firstDate.getMonth() === secondDate.getMonth() &&
    firstDate.getDate() === secondDate.getDate()
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
      previousRange &&
      rangesOverlap(
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
  return sortSlots(slots).filter((slot) => slot.endAt.getTime() >= referenceDate.getTime());
}

export async function getAvailabilitySlots(userId: string): Promise<AvailabilitySlot[]> {
  const payload = await fetchSupabaseReadJson<{ slots: Array<Record<string, unknown>> }>(
    `/api/supabase-read/availability?userId=${encodeURIComponent(userId)}`,
    { requireAuth: true }
  );

  return payload.slots.map((slot) =>
    mapAvailabilitySlot(userId, (slot.id as string) || '', slot)
  );
}

export async function createAvailabilitySlot(
  userId: string,
  data: CreateAvailabilitySlotData
): Promise<string> {
  validateAvailabilitySlotData(data);

  const existingSlots = await getAvailabilitySlots(userId);
  ensureAvailabilityDoesNotOverlap([data], existingSlots);

  const newSlot: AvailabilitySlot = {
    id: generateAvailabilitySlotId(),
    userId,
    startAt: data.startAt,
    endAt: data.endAt,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const nextSlots = sortSlots([...existingSlots, newSlot]);

  await mirrorAvailabilitySlotsToSupabase(userId, nextSlots);
  await syncPublicAvailabilitySummary(userId, getUpcomingAvailabilitySlots(nextSlots));

  return newSlot.id;
}

export async function deleteAvailabilitySlot(userId: string, slotId: string): Promise<void> {
  const existingSlots = await getAvailabilitySlots(userId);
  const nextSlots = existingSlots.filter((slot) => slot.id !== slotId);

  await mirrorAvailabilitySlotsToSupabase(userId, nextSlots);
  await syncPublicAvailabilitySummary(userId, getUpcomingAvailabilitySlots(nextSlots));
}

export async function updateAvailabilitySlot(
  userId: string,
  slotId: string,
  data: CreateAvailabilitySlotData
): Promise<void> {
  validateAvailabilitySlotData(data);

  const existingSlots = await getAvailabilitySlots(userId);
  const currentSlot = existingSlots.find((slot) => slot.id === slotId);
  if (!currentSlot) {
    throw new Error('Availability slot not found');
  }

  const remainingSlots = existingSlots.filter((slot) => slot.id !== slotId);
  ensureAvailabilityDoesNotOverlap([data], remainingSlots);

  const nextSlots = sortSlots([
    ...remainingSlots,
    {
      ...currentSlot,
      startAt: data.startAt,
      endAt: data.endAt,
      updatedAt: new Date(),
    },
  ]);

  await mirrorAvailabilitySlotsToSupabase(userId, nextSlots);
  await syncPublicAvailabilitySummary(userId, getUpcomingAvailabilitySlots(nextSlots));
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
      slot.startAt.getTime() > Date.now() &&
      isSingleDayAvailabilitySlot(slot) &&
      isSameLocalDay(slot.startAt, day)
  );
  const remainingSlots = existingSlots.filter(
    (slot) => !editableSlots.some((editableSlot) => editableSlot.id === slot.id)
  );

  ensureAvailabilityDoesNotOverlap(ranges, remainingSlots);

  if (editableSlots.length === 0 && ranges.length === 0) {
    return;
  }

  const nextSlots = sortSlots([
    ...remainingSlots,
    ...ranges.map((range) => ({
      id: generateAvailabilitySlotId(),
      userId,
      startAt: range.startAt,
      endAt: range.endAt,
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
  ]);

  await mirrorAvailabilitySlotsToSupabase(userId, nextSlots);
  await syncPublicAvailabilitySummary(userId, getUpcomingAvailabilitySlots(nextSlots));
}

async function hasActiveRequestConflict(userId: string, startAt: Date, endAt: Date): Promise<boolean> {
  const payload = await fetchSupabaseReadJson<{ hasConflict: boolean }>(
    `/api/supabase-read/request?scope=conflict-check&sitterId=${encodeURIComponent(userId)}&startAt=${encodeURIComponent(startAt.toISOString())}&endAt=${encodeURIComponent(endAt.toISOString())}`,
    { requireAuth: true }
  );

  return payload.hasConflict === true;
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
  const matchingSlots = getUpcomingAvailabilitySlots(slots).filter((slot) =>
    doesSlotCoverRange(slot, startAt, endAt)
  );

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
