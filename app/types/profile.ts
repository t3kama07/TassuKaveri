export type AvailabilityStatus = 'available' | 'unavailable';
export type ExperienceLevel = 'beginner' | 'intermediate' | 'expert';
export type UserRole = 'user' | 'admin';

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  location: string; // city
  country: string;
  photoURL: string;
  bio: string;
  petExperience: string;
  availability: AvailabilityStatus;
  emailVerified: boolean;
  phoneNumber: string;
  phoneVerified: boolean;
  phoneVerificationCode?: string;
  phoneVerificationExpires?: Date;
  petTypeExperience: string[];
  preferredPetSize: string[];
  experienceLevel: ExperienceLevel;
  experienceWithDogs: boolean;
  experienceWithCats: boolean;
  experienceWithLargeDogs: boolean;
  experienceWithSeniorPets: boolean;
  latitude?: number;
  longitude?: number;
  ratingAverage: number;
  ratingCount: number;
  trustScore: number;
  role: UserRole;
  frozen: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PublicUserProfile {
  uid: string;
  name: string;
  location: string;
  country: string;
  photoURL: string;
  bio: string;
  petExperience: string;
  availability: AvailabilityStatus;
  phoneVerified: boolean;
  petTypeExperience: string[];
  preferredPetSize: string[];
  experienceLevel: ExperienceLevel;
  experienceWithDogs: boolean;
  experienceWithCats: boolean;
  experienceWithLargeDogs: boolean;
  experienceWithSeniorPets: boolean;
  latitude?: number;
  longitude?: number;
  ratingAverage: number;
  ratingCount: number;
  trustScore: number;
  hasDetailedAvailability: boolean;
  nextAvailableStartAt?: Date;
  nextAvailableEndAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProfileData {
  name: string;
  location: string;
  country?: string;
}

export interface UpdateProfileData {
  name?: string;
  location?: string;
  country?: string;
  photoURL?: string;
  bio?: string;
  petExperience?: string;
  availability?: AvailabilityStatus;
  emailVerified?: boolean;
  phoneNumber?: string;
  phoneVerified?: boolean;
  phoneVerificationCode?: string;
  phoneVerificationExpires?: Date;
  petTypeExperience?: string[];
  preferredPetSize?: string[];
  experienceLevel?: ExperienceLevel;
  experienceWithDogs?: boolean;
  experienceWithCats?: boolean;
  experienceWithLargeDogs?: boolean;
  experienceWithSeniorPets?: boolean;
  latitude?: number;
  longitude?: number;
  ratingAverage?: number;
  ratingCount?: number;
  trustScore?: number;
  role?: UserRole;
  frozen?: boolean;
}
