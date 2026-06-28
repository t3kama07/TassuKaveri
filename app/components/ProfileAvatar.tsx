import Image from 'next/image';
import { resolveProfileAvatarUrl } from '@/lib/profileAvatar';

type ProfileAvatarProps = {
  uid?: string;
  name: string;
  photoURL?: string;
  className?: string;
};

export default function ProfileAvatar({
  uid,
  name,
  photoURL,
  className = 'h-14 w-14 rounded-full',
}: ProfileAvatarProps) {
  const src = resolveProfileAvatarUrl(photoURL, uid || name);

  return (
    <Image
      src={src}
      alt={name || 'Profile avatar'}
      width={96}
      height={96}
      unoptimized
      className={`${className} object-cover`}
    />
  );
}
