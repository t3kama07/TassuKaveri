import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createTestUsers } from '../../lib/testUserService';
import { deletePlaywrightTestUsers, listPlaywrightAuthUsers } from './helpers/cleanup';
import { loadE2EEnv } from './helpers/env';
import {
  type E2ERunUsersFile,
  type E2EUserAlias,
  type E2EUserAccount,
  runtimeDir,
  runtimeUsersFile,
} from './helpers/runtime';

const USER_ALIASES: E2EUserAlias[] = [
  'accessMember',
  'profileOwner',
  'profileSitter',
  'searchOwner',
  'searchSitter',
  'bookingOwner',
  'bookingSitter',
];

export default async function globalSetup() {
  loadE2EEnv();

  const previousRunIds = await readFile(runtimeUsersFile, 'utf8')
    .then((contents) => {
      const previousRun = JSON.parse(contents) as E2ERunUsersFile;
      return Object.values(previousRun.users).map((user) => user.uid);
    })
    .catch(() => [] as string[]);
  const staleBefore = Date.now() - 24 * 60 * 60 * 1000;
  const staleUsers = (await listPlaywrightAuthUsers()).filter(
    (user) => new Date(user.createdAt).getTime() < staleBefore
  );
  await deletePlaywrightTestUsers([
    ...previousRunIds,
    ...staleUsers.map((user) => user.id),
  ]);

  const runId = Date.now().toString(36);
  const password = process.env.PLAYWRIGHT_TEST_PASSWORD || 'Playwright123!';
  const prefix = `pw${runId}user`;
  const results = await createTestUsers({
    prefix,
    domain: 'example.com',
    count: USER_ALIASES.length,
    startAt: 1,
    password,
    location: 'Oulu',
    country: 'Finland',
  });

  const failedResults = results.filter((result) => result.status === 'failed');
  if (failedResults.length > 0) {
    throw new Error(
      `Playwright seed failed for: ${failedResults
        .map((result) => `${result.email} (${result.message})`)
        .join(', ')}`
    );
  }

  const users = {} as Record<E2EUserAlias, E2EUserAccount>;

  USER_ALIASES.forEach((alias, index) => {
    const result = results[index];
    users[alias] = {
      alias,
      email: result.email,
      password: result.password,
      name: result.name,
      uid: result.uid || '',
    };
  });

  const payload: E2ERunUsersFile = {
    runId,
    generatedAt: new Date().toISOString(),
    users,
  };

  await mkdir(runtimeDir, { recursive: true });
  await writeFile(runtimeUsersFile, JSON.stringify(payload, null, 2), 'utf8');
}
