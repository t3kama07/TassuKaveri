import { unlink } from 'node:fs/promises';
import { loadE2EEnv } from './helpers/env';
import { deletePlaywrightTestUsers, listPlaywrightAuthUsers } from './helpers/cleanup';
import { readRunUsers, runtimeUsersFile } from './helpers/runtime';

export default async function globalTeardown() {
  loadE2EEnv();

  let run;
  try {
    run = readRunUsers();
  } catch {
    return;
  }

  const generatedAt = new Date(run.generatedAt).getTime();
  const seededUserIds = Object.values(run.users).map((user) => user.uid);
  const usersCreatedDuringRun = (await listPlaywrightAuthUsers())
    .filter((user) => new Date(user.createdAt).getTime() >= generatedAt)
    .map((user) => user.id);

  await deletePlaywrightTestUsers([...seededUserIds, ...usersCreatedDuringRun]);
  await unlink(runtimeUsersFile).catch(() => undefined);
}
