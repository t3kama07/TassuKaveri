import type { Locator, Page } from '@playwright/test';

type Scope = Page | Locator;

export function fieldByLabel(scope: Scope, labelText: string): Locator {
  return scope.getByLabel(labelText, { exact: true });
}
