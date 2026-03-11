export type RequestStatus = 'open' | 'accepted' | 'awaiting_confirmation' | 'completed' | 'cancelled';
export type CareType = 'daily-visit' | 'overnight' | 'boarding' | 'walking';
export type EscrowStatus = 'none' | 'held' | 'released' | 'refunded';

export interface RequestApplication {
  sitterId: string;
  sitterName: string;
  message?: string;
  appliedAt: Date;
}

export interface RequestReview {
  rating: number;
  comment: string;
  reviewerId: string;
  reviewerName: string;
  reviewedAt: Date;
}

export interface Request {
  id: string;
  ownerId: string;
  ownerName: string;
  petIds: string[];
  petNames: string[];
  careType: CareType;
  startDate: Date;
  endDate: Date;
  location: string;
  locationLat?: number;
  locationLng?: number;
  creditsOffered: number;
  status: RequestStatus;
  escrowStatus?: EscrowStatus;
  sitterId?: string;
  sitterName?: string;
  applications?: RequestApplication[];
  review?: RequestReview;
  notes?: string;
  feedingSchedule?: string;
  walkSchedule?: string;
  medicationInstructions?: string;
  sleepInstructions?: string;
  specialWarnings?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateRequestData {
  petIds: string[];
  careType: CareType;
  startDate: Date;
  endDate: Date;
  location: string;
  locationLat?: number;
  locationLng?: number;
  creditsOffered: number;
  notes?: string;
  feedingSchedule?: string;
  walkSchedule?: string;
  medicationInstructions?: string;
  sleepInstructions?: string;
  specialWarnings?: string;
}

export interface UpdateRequestData {
  petIds?: string[];
  careType?: CareType;
  startDate?: Date;
  endDate?: Date;
  location?: string;
  locationLat?: number;
  locationLng?: number;
  creditsOffered?: number;
  notes?: string;
  feedingSchedule?: string;
  walkSchedule?: string;
  medicationInstructions?: string;
  sleepInstructions?: string;
  specialWarnings?: string;
}
