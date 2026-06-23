import type { Locator, Page } from '@playwright/test';

type Scope = Page | Locator;

export function fieldByLabel(scope: Scope, labelText: string): Locator {
  return scope
    .locator('label')
    .filter({ hasText: labelText })
    .first()
    .locator('xpath=..')
    .locator('input, textarea, select')
    .first();
}
