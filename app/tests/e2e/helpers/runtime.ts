import fs from 'node:fs';
import path from 'node:path';

export type E2EUserAlias =
  | 'accessMember'
  | 'profileOwner'
  | 'profileSitter'
  | 'searchOwner'
  | 'searchSitter'
  | 'bookingOwner'
  | 'bookingSitter';

export interface E2EUserAccount {
  alias: E2EUserAlias;
  email: string;
  password: string;
  name: string;
  uid: string;
}

export interface E2ERunUsersFile {
  runId: string;
  generatedAt: string;
  users: Record<E2EUserAlias, E2EUserAccount>;
}

export const runtimeDir = path.resolve(process.cwd(), 'tests/e2e/.runtime');
export const runtimeUsersFile = path.join(runtimeDir, 'users.json');

let cachedUsers: E2ERunUsersFile | null = null;

export function readRunUsers(): E2ERunUsersFile {
  if (cachedUsers) {
    return cachedUsers;
  }

  if (!fs.existsSync(runtimeUsersFile)) {
    throw new Error(
      `Missing Playwright runtime users file at ${runtimeUsersFile}. Run the suite through Playwright global setup first.`
    );
  }

  cachedUsers = JSON.parse(fs.readFileSync(runtimeUsersFile, 'utf8')) as E2ERunUsersFile;
  return cachedUsers;
}
