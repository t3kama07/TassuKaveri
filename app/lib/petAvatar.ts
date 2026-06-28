import type { PetType } from '@/types/pet';
import { CUTE_PET_AVATAR_SVGS } from './cutePetSvg';

function encodeSvg(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function getPetAvatarUrl(type: PetType): string {
  return encodeSvg(CUTE_PET_AVATAR_SVGS[type] ?? CUTE_PET_AVATAR_SVGS.other);
}
