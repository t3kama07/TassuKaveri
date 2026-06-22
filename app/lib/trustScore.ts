import { UserProfile } from '@/types/profile';

export function isProfileCompleted(
  profile: Pick<UserProfile, 'name' | 'location' | 'bio' | 'petExperience' | 'photoURL'>
): boolean {
  return Boolean(
    profile.name.trim() &&
      profile.location.trim() &&
      profile.bio.trim() &&
      profile.petExperience.trim() &&
      profile.photoURL.trim()
  );
}

export function calculateTrustScore(profile: UserProfile, completedSits: number): number {
  let score = 0;

  if (isProfileCompleted(profile)) {
    score += 20;
  }
  if (profile.emailVerified) {
    score += 10;
  }
  score += Math.max(0, completedSits) * 3;
  if (profile.ratingAverage > 4.5) {
    score += 10;
  }

  return Math.min(score, 100);
}
