import { getSupabaseAuthHeaders } from './supabaseAuthClient';

const MAX_PROFILE_IMAGE_BYTES = 5 * 1024 * 1024;

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '-');
}

function validateProfileImage(file: File): void {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose an image file.');
  }

  if (file.size > MAX_PROFILE_IMAGE_BYTES) {
    throw new Error('Image must be 5 MB or smaller.');
  }
}

async function uploadProfileImageToSupabase(userId: string, file: File): Promise<string | null> {
  const headers = await getSupabaseAuthHeaders(userId);
  const formData = new FormData();
  formData.append('userId', userId);
  formData.append('file', file, file.name || 'profile-image');

  const response = await fetch('/api/supabase-sync/profile-image', {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const payload = (await response.json()) as { publicUrl?: string };
  return typeof payload.publicUrl === 'string' ? payload.publicUrl : null;
}

export async function uploadProfileImage(userId: string, file: File): Promise<string> {
  validateProfileImage(file);
  const safeFile = new File([file], sanitizeFileName(file.name || 'profile-image'), {
    type: file.type,
  });
  const supabaseUrl = await uploadProfileImageToSupabase(userId, safeFile);
  if (!supabaseUrl) {
    throw new Error('Failed to upload profile image.');
  }

  return supabaseUrl;
}
