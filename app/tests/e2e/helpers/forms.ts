import type { Locator, Page } from '@playwright/test';

type Scope = Page | Locator;

export function fieldByLabel(scope: Scope, labelText: string): Locator {
  return scope
    .locator('label')
    .filter({ hasText: labelText })
    .locator('xpath=following-sibling::*[1][self::input or self::textarea or self::select]');
}
