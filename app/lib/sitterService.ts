import { AvailabilitySlot } from '@/types/availability';
import { PublicUserProfile } from '@/types/profile';
import { getAvailablePublicProfiles } from './publicProfileService';
import { isProfileCompleted } from './profileService';

export interface NearbySitter {
  profile: PublicUserProfile;
  distanceKm?: number;
  profileCompleted: boolean;
  matchScore: number;
  nextAvailableSlot?: AvailabilitySlot;
  matchingSlots: AvailabilitySlot[];
  hasDetailedAvailability: boolean;
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

function calculateExperienceMatchScore(
  profile: PublicUserProfile,
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

function createSummarySlot(profile: PublicUserProfile): AvailabilitySlot | undefined {
  if (!profile.nextAvailableStartAt || !profile.nextAvailableEndAt) {
    return undefined;
  }

  return {
    id: `summary-${profile.uid}`,
    userId: profile.uid,
    startAt: profile.nextAvailableStartAt,
    endAt: profile.nextAvailableEndAt,
    createdAt: profile.updatedAt,
    updatedAt: profile.updatedAt,
  };
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
  requestedStartAt?: Date;
  requestedEndAt?: Date;
}): Promise<NearbySitter[]> {
  const profiles = await getAvailablePublicProfiles();

  const normalizedCity = (options.city || '').trim().toLowerCase();
  const maxDistanceKm = options.maxDistanceKm ?? 10;
  const hasUserCoords = options.latitude !== undefined && options.longitude !== undefined;

  const results: NearbySitter[] = [];

  profiles.forEach((profile) => {
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
      matchScore: calculateExperienceMatchScore(
        profile,
        options.petTypes || [],
        options.petSize,
        options.requiredExperienceLevel
      ),
      nextAvailableSlot: createSummarySlot(profile),
      matchingSlots: [],
      hasDetailedAvailability: profile.hasDetailedAvailability,
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
