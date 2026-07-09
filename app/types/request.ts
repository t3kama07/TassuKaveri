export type RequestStatus = 'open' | 'accepted' | 'awaiting_confirmation' | 'completed' | 'cancelled';
export type CareType = 'daily-visit' | 'overnight' | 'boarding' | 'walking';
export type EscrowStatus = 'none' | 'held' | 'released' | 'refunded';
export type RequestAudience = 'community' | 'direct';
export type RequestCancellationActor = 'owner' | 'sitter';
export type CancellationCreditOutcome = 'owner_refunded' | 'sitter_paid';

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

export interface RequestPetSafetyInfo {
  petId: string;
  name: string;
  behaviour: string;
  aggressiveBehavior: string;
  medicalConditions: string;
  medicationRequired: boolean;
  medicationInstructions: string;
  allergies: string;
  feedingInstructions: string;
  specialCareRequirements: string;
  escapeRisk: string;
  childBehavior: string;
  animalBehavior: string;
  veterinarianDetails: string;
  emergencyContactInfo: string;
}

export interface Request {
  id: string;
  ownerId: string;
  ownerName: string;
  petIds: string[];
  petNames: string[];
  petSafetyInfo?: RequestPetSafetyInfo[];
  careType: CareType;
  startDate: Date;
  endDate: Date;
  location: string;
  locationLat?: number;
  locationLng?: number;
  creditsOffered: number;
  status: RequestStatus;
  audience: RequestAudience;
  escrowStatus?: EscrowStatus;
  sitterId?: string;
  sitterName?: string;
  requestedSitterId?: string;
  requestedSitterName?: string;
  applications?: RequestApplication[];
  review?: RequestReview;
  ownerReview?: RequestReview;
  sitterReview?: RequestReview;
  markedCompleteAt?: Date;
  confirmedCompleteAt?: Date;
  cancelledBy?: RequestCancellationActor;
  cancelledAt?: Date;
  cancellationCreditOutcome?: CancellationCreditOutcome;
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
  petSafetyInfo?: RequestPetSafetyInfo[];
  careType: CareType;
  startDate: Date;
  endDate: Date;
  location: string;
  locationLat?: number;
  locationLng?: number;
  creditsOffered: number;
  audience?: RequestAudience;
  requestedSitterId?: string;
  requestedSitterName?: string;
  notes?: string;
  feedingSchedule?: string;
  walkSchedule?: string;
  medicationInstructions?: string;
  sleepInstructions?: string;
  specialWarnings?: string;
}

export interface UpdateRequestData {
  petIds?: string[];
  petSafetyInfo?: RequestPetSafetyInfo[];
  careType?: CareType;
  startDate?: Date;
  endDate?: Date;
  location?: string;
  locationLat?: number;
  locationLng?: number;
  creditsOffered?: number;
  audience?: RequestAudience;
  requestedSitterId?: string;
  requestedSitterName?: string;
  notes?: string;
  feedingSchedule?: string;
  walkSchedule?: string;
  medicationInstructions?: string;
  sleepInstructions?: string;
  specialWarnings?: string;
}
