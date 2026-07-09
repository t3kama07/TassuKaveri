export type PetType =
  | 'dog'
  | 'cat'
  | 'rabbit'
  | 'bird'
  | 'small-mammal'
  | 'reptile'
  | 'fish'
  | 'other';
export type PetSize = 'small' | 'medium' | 'large';

export interface Pet {
  id: string;
  ownerId: string;
  name: string;
  type: PetType;
  breed: string;
  age: number;
  size: PetSize;
  notes: string;
  behaviour: string;
  aggressiveBehavior: string;
  medicalConditions: string;
  allergies: string;
  vaccinationStatus: string;
  friendlyWithDogs: boolean;
  friendlyWithCats: boolean;
  friendlyWithChildren: boolean;
  medicationRequired: boolean;
  medicationInstructions: string;
  feedingInstructions: string;
  specialCareInstructions: string;
  escapeRisk: string;
  childBehavior: string;
  animalBehavior: string;
  veterinarianDetails: string;
  emergencyVetContact: string;
  emergencyContactInfo: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePetData {
  name: string;
  type: PetType;
  breed: string;
  age: number;
  size: PetSize;
  notes: string;
  behaviour?: string;
  aggressiveBehavior?: string;
  medicalConditions?: string;
  allergies?: string;
  vaccinationStatus?: string;
  friendlyWithDogs?: boolean;
  friendlyWithCats?: boolean;
  friendlyWithChildren?: boolean;
  medicationRequired?: boolean;
  medicationInstructions?: string;
  feedingInstructions?: string;
  specialCareInstructions?: string;
  escapeRisk?: string;
  childBehavior?: string;
  animalBehavior?: string;
  veterinarianDetails?: string;
  emergencyVetContact?: string;
  emergencyContactInfo?: string;
}

export interface UpdatePetData {
  name?: string;
  type?: PetType;
  breed?: string;
  age?: number;
  size?: PetSize;
  notes?: string;
  behaviour?: string;
  aggressiveBehavior?: string;
  medicalConditions?: string;
  allergies?: string;
  vaccinationStatus?: string;
  friendlyWithDogs?: boolean;
  friendlyWithCats?: boolean;
  friendlyWithChildren?: boolean;
  medicationRequired?: boolean;
  medicationInstructions?: string;
  feedingInstructions?: string;
  specialCareInstructions?: string;
  escapeRisk?: string;
  childBehavior?: string;
  animalBehavior?: string;
  veterinarianDetails?: string;
  emergencyVetContact?: string;
  emergencyContactInfo?: string;
}
