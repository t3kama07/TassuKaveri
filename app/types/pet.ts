export type PetType = 'dog' | 'cat' | 'other';
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
  allergies: string;
  vaccinationStatus: string;
  friendlyWithDogs: boolean;
  friendlyWithCats: boolean;
  friendlyWithChildren: boolean;
  medicationRequired: boolean;
  specialCareInstructions: string;
  emergencyVetContact: string;
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
  allergies?: string;
  vaccinationStatus?: string;
  friendlyWithDogs?: boolean;
  friendlyWithCats?: boolean;
  friendlyWithChildren?: boolean;
  medicationRequired?: boolean;
  specialCareInstructions?: string;
  emergencyVetContact?: string;
}

export interface UpdatePetData {
  name?: string;
  type?: PetType;
  breed?: string;
  age?: number;
  size?: PetSize;
  notes?: string;
  behaviour?: string;
  allergies?: string;
  vaccinationStatus?: string;
  friendlyWithDogs?: boolean;
  friendlyWithCats?: boolean;
  friendlyWithChildren?: boolean;
  medicationRequired?: boolean;
  specialCareInstructions?: string;
  emergencyVetContact?: string;
}
