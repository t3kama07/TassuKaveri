import { createSupabaseAdminClient } from './supabaseAdmin';

export const PROFILE_IMAGES_BUCKET = 'profile-images';
export const MAX_PROFILE_IMAGE_BYTES = 5 * 1024 * 1024;

let ensureProfileImagesBucketPromise: Promise<void> | null = null;

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '-');
}

async function ensureProfileImagesBucketInternal(): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.storage.getBucket(PROFILE_IMAGES_BUCKET);

  if (error && !/not found/i.test(error.message)) {
    throw new Error(`Failed to inspect Supabase storage bucket: ${error.message}`);
  }

  if (!data) {
    const { error: createError } = await supabase.storage.createBucket(PROFILE_IMAGES_BUCKET, {
      public: true,
      fileSizeLimit: MAX_PROFILE_IMAGE_BYTES,
    });

    if (createError && !/already exists/i.test(createError.message)) {
      throw new Error(`Failed to create Supabase storage bucket: ${createError.message}`);
    }

    return;
  }

  const bucketData = data as {
    public?: boolean;
    file_size_limit?: number | null;
  };

  if (bucketData.public === true && bucketData.file_size_limit === MAX_PROFILE_IMAGE_BYTES) {
    return;
  }

  const { error: updateError } = await supabase.storage.updateBucket(PROFILE_IMAGES_BUCKET, {
    public: true,
    fileSizeLimit: MAX_PROFILE_IMAGE_BYTES,
  });

  if (updateError) {
    throw new Error(`Failed to update Supabase storage bucket: ${updateError.message}`);
  }
}

export async function ensureProfileImagesBucket(): Promise<void> {
  if (!ensureProfileImagesBucketPromise) {
    ensureProfileImagesBucketPromise = ensureProfileImagesBucketInternal().catch((error) => {
      ensureProfileImagesBucketPromise = null;
      throw error;
    });
  }

  await ensureProfileImagesBucketPromise;
}

export async function uploadProfileImageToSupabase(params: {
  userId: string;
  fileName: string;
  contentType: string;
  fileData: ArrayBuffer | Uint8Array;
}): Promise<{ path: string; publicUrl: string }> {
  await ensureProfileImagesBucket();

  const supabase = createSupabaseAdminClient();
  const safeFileName = sanitizeFileName(params.fileName || 'profile-image');
  const objectPath = `${params.userId}/${Date.now()}-${safeFileName}`;
  const uploadBody =
    params.fileData instanceof Uint8Array ? params.fileData : new Uint8Array(params.fileData);

  const { error } = await supabase.storage.from(PROFILE_IMAGES_BUCKET).upload(objectPath, uploadBody, {
    cacheControl: '3600',
    contentType: params.contentType,
    upsert: false,
  });

  if (error) {
    throw new Error(`Failed to upload profile image to Supabase: ${error.message}`);
  }

  const { data } = supabase.storage.from(PROFILE_IMAGES_BUCKET).getPublicUrl(objectPath);
  if (!data.publicUrl) {
    throw new Error('Supabase did not return a public URL for the uploaded profile image');
  }

  return {
    path: objectPath,
    publicUrl: data.publicUrl,
  };
}
