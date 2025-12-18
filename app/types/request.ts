export type RequestStatus = 'open' | 'accepted' | 'completed' | 'cancelled';
export type CareType = 'daily-visit' | 'overnight' | 'boarding' | 'walking';

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
  creditsOffered: number;
  status: RequestStatus;
  sitterId?: string;
  sitterName?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateRequestData {
  petIds: string[];
  careType: CareType;
  startDate: Date;
  endDate: Date;
  location: string;
  creditsOffered: number;
  notes?: string;
}

export interface UpdateRequestData {
  petIds?: string[];
  careType?: CareType;
  startDate?: Date;
  endDate?: Date;
  location?: string;
  creditsOffered?: number;
  notes?: string;
}
