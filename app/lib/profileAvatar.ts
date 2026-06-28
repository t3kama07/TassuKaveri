import { CUTE_PET_AVATAR_SVGS } from './cutePetSvg';

export type ProfileAvatarId = 'dog' | 'cat' | 'rabbit' | 'hamster';

type AvatarOption = {
  id: ProfileAvatarId;
  label: string;
  svg: string;
};

export const PROFILE_AVATAR_OPTIONS: AvatarOption[] = [
  {
    id: 'dog',
    label: 'Bandana dog',
    svg: CUTE_PET_AVATAR_SVGS.dog,
  },
  {
    id: 'cat',
    label: 'Box cat',
    svg: CUTE_PET_AVATAR_SVGS.cat,
  },
  {
    id: 'rabbit',
    label: 'Bow bunny',
    svg: CUTE_PET_AVATAR_SVGS.rabbit,
  },
  {
    id: 'hamster',
    label: 'Round hamster',
    svg: CUTE_PET_AVATAR_SVGS['small-mammal'],
  },
];

function encodeSvg(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function getProfileAvatarUrl(id: ProfileAvatarId): string {
  return encodeSvg(PROFILE_AVATAR_OPTIONS.find((option) => option.id === id)?.svg ?? PROFILE_AVATAR_OPTIONS[0].svg);
}

export function isProfileAvatarUrl(value: string): boolean {
  return PROFILE_AVATAR_OPTIONS.some((option) => value === getProfileAvatarUrl(option.id));
}

export function isGeneratedProfileAvatarUrl(value: string): boolean {
  return value.startsWith('data:image/svg+xml;utf8,');
}

export function resolveProfileAvatarUrl(photoURL: string | undefined, seed: string): string {
  const trimmedPhotoURL = photoURL?.trim() ?? '';
  if (!trimmedPhotoURL) {
    return getAutomaticProfileAvatarUrl(seed);
  }

  if (isGeneratedProfileAvatarUrl(trimmedPhotoURL) && !isProfileAvatarUrl(trimmedPhotoURL)) {
    return getAutomaticProfileAvatarUrl(seed);
  }

  return trimmedPhotoURL;
}

export function getAutomaticProfileAvatarId(seed: string): ProfileAvatarId {
  const ids = PROFILE_AVATAR_OPTIONS.map((option) => option.id);
  const normalizedSeed = seed.trim() || 'tassukaveri';
  let hash = 0;

  for (let index = 0; index < normalizedSeed.length; index += 1) {
    hash = (hash * 31 + normalizedSeed.charCodeAt(index)) >>> 0;
  }

  return ids[hash % ids.length];
}

export function getAutomaticProfileAvatarUrl(seed: string): string {
  return getProfileAvatarUrl(getAutomaticProfileAvatarId(seed));
}
