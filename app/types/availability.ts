export interface AvailabilitySlot {
  id: string;
  userId: string;
  startAt: Date;
  endAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAvailabilitySlotData {
  startAt: Date;
  endAt: Date;
}

export interface AvailabilityMatchResult {
  available: boolean;
  matchingSlots: AvailabilitySlot[];
  hasConflict: boolean;
}
