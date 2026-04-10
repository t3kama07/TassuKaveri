import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(appRoot, '.env.local') });

function getSupabaseUrl() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL in .env.local');
  }

  return url;
}

function getSupabaseServiceRoleKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY in .env.local');
  }

  return key;
}

function createSupabaseAdminClient() {
  return createClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function main() {
  const [, , bucketArg = 'profile-images'] = process.argv;
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.storage.getBucket(bucketArg);

  if (error && !/not found/i.test(error.message)) {
    throw new Error(`Failed to inspect bucket "${bucketArg}": ${error.message}`);
  }

  if (!data) {
    const { error: createError } = await supabase.storage.createBucket(bucketArg, {
      public: true,
      fileSizeLimit: 5 * 1024 * 1024,
    });

    if (createError && !/already exists/i.test(createError.message)) {
      throw new Error(`Failed to create bucket "${bucketArg}": ${createError.message}`);
    }

    console.log(`Created Supabase storage bucket: ${bucketArg}`);
    return;
  }

  const { error: updateError } = await supabase.storage.updateBucket(bucketArg, {
    public: true,
    fileSizeLimit: 5 * 1024 * 1024,
  });

  if (updateError) {
    throw new Error(`Failed to update bucket "${bucketArg}": ${updateError.message}`);
  }

  console.log(`Verified Supabase storage bucket: ${bucketArg}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
