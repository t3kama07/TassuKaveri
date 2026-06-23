import { expect, type Locator, type Page } from '@playwright/test';
import { fieldByLabel } from './forms';

export async function confirmNextDialog(page: Page) {
  page.once('dialog', async (dialog) => {
    await dialog.accept();
  });
}

export async function createDirectRequestFromProfile(
  page: Page,
  values: {
    sitterUid: string;
    petName: string;
    startDate: string;
    endDate: string;
    startTime: string;
    endTime: string;
    location: string;
    notes: string;
  }
) {
  await page.goto(`/sitters/${values.sitterUid}`);
  await page.getByRole('link', { name: 'Ask this sitter', exact: true }).click();

  const form = page.locator('form');
  const petCheckbox = form.getByLabel(new RegExp(values.petName, 'i'));
  await petCheckbox.check();
  await expect(petCheckbox).toBeChecked();
  await fieldByLabel(form, 'Start date').fill(values.startDate);
  await fieldByLabel(form, 'Start time').fill(values.startTime);
  await fieldByLabel(form, 'End date').fill(values.endDate);
  await fieldByLabel(form, 'End time').fill(values.endTime);
  await fieldByLabel(form, 'Location').selectOption(values.location);
  await fieldByLabel(form, 'Notes for the sitter').fill(values.notes);
}

export async function openExchangeTab(
  page: Page,
  tabName: 'My Requests' | 'Direct Requests' | 'Community Requests' | 'My Sits'
) {
  await page.getByRole('button', { name: tabName, exact: true }).click();
}

export async function requestCardByText(page: Page, text: string): Promise<Locator> {
  const card = page.locator('div').filter({ hasText: text }).first();
  await expect(card).toBeVisible();
  return card;
}

export async function sendChatMessage(page: Page, text: string) {
  await page.goto('/messages');
  await expect(page.getByPlaceholder('Type a message...')).toBeVisible();
  await page.getByPlaceholder('Type a message...').fill(text);
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(page.getByText('Message sent.')).toBeVisible();
}
