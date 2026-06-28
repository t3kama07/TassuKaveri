import Image from 'next/image';
import { getPetAvatarUrl } from '@/lib/petAvatar';
import type { PetType } from '@/types/pet';

type PetAvatarProps = {
  name: string;
  type: PetType;
  className?: string;
};

export default function PetAvatar({
  name,
  type,
  className = 'h-16 w-16 rounded-2xl',
}: PetAvatarProps) {
  return (
    <Image
      src={getPetAvatarUrl(type)}
      alt={`${name || 'Pet'} avatar`}
      width={96}
      height={96}
      unoptimized
      className={`${className} object-cover`}
    />
  );
}
