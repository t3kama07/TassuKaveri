import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import pg from 'pg';

const { Client } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(appRoot, '.env.local') });

function getDatabaseUrl() {
  const databaseUrl = process.env.SUPABASE_DB_URL;
  if (!databaseUrl) {
    throw new Error('Missing SUPABASE_DB_URL in .env.local');
  }

  const normalizedUrl = new URL(databaseUrl);
  normalizedUrl.searchParams.delete('sslmode');

  return normalizedUrl.toString();
}

async function readSqlFile(fileArg) {
  const relativeTarget = fileArg || 'supabase/SETUP.sql';
  const absoluteTarget = path.isAbsolute(relativeTarget)
    ? relativeTarget
    : path.join(appRoot, relativeTarget);

  const sql = await fs.readFile(absoluteTarget, 'utf8');
  return { absoluteTarget, sql };
}

async function main() {
  const [, , sqlFileArg] = process.argv;
  const { absoluteTarget, sql } = await readSqlFile(sqlFileArg);

  const client = new Client({
    connectionString: getDatabaseUrl(),
    ssl: {
      rejectUnauthorized: false,
    },
  });

  await client.connect();

  try {
    await client.query(sql);
    console.log(`Executed SQL successfully: ${absoluteTarget}`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
