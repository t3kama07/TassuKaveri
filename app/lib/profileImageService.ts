import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from './firebase';

const MAX_PROFILE_IMAGE_BYTES = 5 * 1024 * 1024;

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '-');
}

export async function uploadProfileImage(userId: string, file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose an image file.');
  }

  if (file.size > MAX_PROFILE_IMAGE_BYTES) {
    throw new Error('Image must be 5 MB or smaller.');
  }

  const safeFileName = sanitizeFileName(file.name || 'profile-image');
  const imageRef = ref(storage, `profile-images/${userId}/${Date.now()}-${safeFileName}`);

  await uploadBytes(imageRef, file, {
    contentType: file.type,
  });

  return getDownloadURL(imageRef);
}
