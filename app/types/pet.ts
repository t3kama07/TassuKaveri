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
}

export interface UpdatePetData {
  name?: string;
  type?: PetType;
  breed?: string;
  age?: number;
  size?: PetSize;
  notes?: string;
}
