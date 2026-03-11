import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebase';
import { AvailabilityStatus, UserProfile } from '@/types/profile';
import { isProfileCompleted } from './profileService';

export interface NearbySitter {
  profile: UserProfile;
  distanceKm?: number;
  profileCompleted: boolean;
  emailVerified: boolean;
  matchScore: number;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function toDate(value: unknown): Date {
  if (value && typeof value === 'object' && 'toDate' in value && typeof (value as any).toDate === 'function') {
    return (value as any).toDate();
  }
  return new Date();
}

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

function mapUserProfile(id: string, data: Record<string, unknown>): UserProfile {
  return {
    uid: (data.uid as string) || id,
    email: (data.email as string) || '',
    name: (data.name as string) || 'User',
    location: (data.location as string) || '',
    country: (data.country as string) || 'Finland',
    photoURL: (data.photoURL as string) || '',
    bio: (data.bio as string) || '',
    petExperience: (data.petExperience as string) || '',
    availability: ((data.availability as AvailabilityStatus) || 'available'),
    emailVerified: Boolean(data.emailVerified),
    phoneNumber: (data.phoneNumber as string) || '',
    phoneVerified: Boolean(data.phoneVerified),
    phoneVerificationCode: (data.phoneVerificationCode as string) || undefined,
    phoneVerificationExpires:
      data.phoneVerificationExpires && typeof (data.phoneVerificationExpires as any).toDate === 'function'
        ? (data.phoneVerificationExpires as any).toDate()
        : undefined,
    petTypeExperience: Array.isArray(data.petTypeExperience) ? (data.petTypeExperience as string[]) : [],
    preferredPetSize: Array.isArray(data.preferredPetSize) ? (data.preferredPetSize as string[]) : [],
    experienceLevel: (data.experienceLevel as UserProfile['experienceLevel']) || 'beginner',
    experienceWithDogs: Boolean(data.experienceWithDogs),
    experienceWithCats: Boolean(data.experienceWithCats),
    experienceWithLargeDogs: Boolean(data.experienceWithLargeDogs),
    experienceWithSeniorPets: Boolean(data.experienceWithSeniorPets),
    latitude: asNumber(data.latitude),
    longitude: asNumber(data.longitude),
    ratingAverage: asNumber(data.ratingAverage) || 0,
    ratingCount: asNumber(data.ratingCount) || 0,
    trustScore: asNumber(data.trustScore) || 0,
    role: (data.role as UserProfile['role']) || 'user',
    frozen: Boolean(data.frozen),
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

function calculateExperienceMatchScore(
  profile: UserProfile,
  petTypes: string[],
  petSize?: string,
  requiredExperienceLevel?: string
): number {
  let score = 0;
  const normalizedPetTypes = petTypes.map((petType) => petType.toLowerCase());

  if (normalizedPetTypes.includes('dog') && (profile.experienceWithDogs || profile.petTypeExperience.includes('dog'))) {
    score += 25;
  }
  if (normalizedPetTypes.includes('cat') && (profile.experienceWithCats || profile.petTypeExperience.includes('cat'))) {
    score += 25;
  }
  if (petSize && profile.preferredPetSize.includes(petSize)) {
    score += 15;
  }

  if (petSize === 'large' && profile.experienceWithLargeDogs) {
    score += 20;
  }

  if (requiredExperienceLevel) {
    const levelOrder: Record<string, number> = {
      beginner: 1,
      intermediate: 2,
      expert: 3,
    };

    const required = levelOrder[requiredExperienceLevel] || 1;
    const sitter = levelOrder[profile.experienceLevel] || 1;
    if (sitter >= required) {
      score += 15;
    }
  }

  return score;
}

export async function getAvailableSitters(options: {
  excludeUserId?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  maxDistanceKm?: number;
  petTypes?: string[];
  petSize?: string;
  requiredExperienceLevel?: string;
}): Promise<NearbySitter[]> {
  const sittersQuery = query(collection(db, 'users'), where('availability', '==', 'available'));
  const snapshot = await getDocs(sittersQuery);

  const normalizedCity = (options.city || '').trim().toLowerCase();
  const maxDistanceKm = options.maxDistanceKm ?? 10;
  const hasUserCoords = options.latitude !== undefined && options.longitude !== undefined;

  const results: NearbySitter[] = [];

  snapshot.forEach((docSnap) => {
    const profile = mapUserProfile(docSnap.id, docSnap.data());
    if (options.excludeUserId && profile.uid === options.excludeUserId) {
      return;
    }

    if (normalizedCity && !profile.location.toLowerCase().includes(normalizedCity)) {
      return;
    }

    let distance: number | undefined;
    const sitterHasCoords = profile.latitude !== undefined && profile.longitude !== undefined;

    if (hasUserCoords && sitterHasCoords) {
      distance = distanceKm(
        options.latitude!,
        options.longitude!,
        profile.latitude!,
        profile.longitude!
      );
      if (distance > maxDistanceKm) {
        return;
      }
    }

    results.push({
      profile,
      distanceKm: distance,
      profileCompleted: isProfileCompleted(profile),
      emailVerified: profile.emailVerified,
      matchScore: calculateExperienceMatchScore(
        profile,
        options.petTypes || [],
        options.petSize,
        options.requiredExperienceLevel
      ),
    });
  });

  results.sort((a, b) => {
    if (a.matchScore !== b.matchScore) {
      return b.matchScore - a.matchScore;
    }
    const aDistance = a.distanceKm ?? Number.MAX_SAFE_INTEGER;
    const bDistance = b.distanceKm ?? Number.MAX_SAFE_INTEGER;
    if (aDistance !== bDistance) {
      return aDistance - bDistance;
    }
    return b.profile.ratingAverage - a.profile.ratingAverage;
  });

  return results;
}
