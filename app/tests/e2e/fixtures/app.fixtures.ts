import { test as base, expect } from '@playwright/test';
import { readRunUsers } from '../helpers/runtime';

export const test = base.extend<{
  appUsers: ReturnType<typeof readRunUsers>['users'];
  runId: string;
}>({
  appUsers: async ({}, use) => {
    await use(readRunUsers().users);
  },
  runId: async ({}, use) => {
    await use(readRunUsers().runId);
  },
});

export { expect };
