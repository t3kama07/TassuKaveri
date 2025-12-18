export type UserRole = 'owner' | 'sitter' | 'both';

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  location: string; // city
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProfileData {
  name: string;
  location: string;
  role: UserRole;
}

export interface UpdateProfileData {
  name?: string;
  location?: string;
  role?: UserRole;
}
