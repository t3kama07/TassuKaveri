import path from 'node:path';
import { config as loadDotEnv } from 'dotenv';

let loaded = false;

export function loadE2EEnv() {
  if (loaded) {
    return;
  }

  const rootDir = process.cwd();

  for (const envFile of ['.env.local', '.env']) {
    loadDotEnv({
      path: path.resolve(rootDir, envFile),
      override: false,
    });
  }

  loaded = true;
}

export function getBaseURL() {
  loadE2EEnv();
  return process.env.PLAYWRIGHT_BASE_URL || process.env.BASE_URL || 'http://127.0.0.1:3000';
}
