import { expect, type Locator, type Page } from '@playwright/test';
import { fieldByLabel } from './forms';

function checkboxByText(scope: Page | Locator, text: string) {
  return scope.getByLabel(text, { exact: true });
}

export async function completeProfile(
  page: Page,
  details: {
    name: string;
    bio: string;
    petExperience: string;
    availability: 'available' | 'unavailable';
    experienceLevel: 'beginner' | 'intermediate' | 'expert';
    petTypes: Array<
      'Dog' | 'Cat' | 'Rabbit' | 'Bird' | 'Small mammal' | 'Reptile' | 'Fish' | 'Other'
    >;
    preferredSizes: Array<'Small' | 'Medium' | 'Large'>;
    experienceFlags?: Array<
      | 'Confident handling large dogs'
      | 'Experienced with senior pets'
    >;
  }
) {
  await page.goto('/profile');
  const heroSection = page.locator('main section').first();
  await heroSection
    .getByRole('button', { name: /edit profile|finish profile/i })
    .first()
    .click();

  const form = page.locator('form');
  await fieldByLabel(form, 'Name').fill(details.name);
  await fieldByLabel(form, 'City').selectOption('Oulu');
  await fieldByLabel(form, 'Short intro').fill(details.bio);
  await fieldByLabel(form, 'Pet care experience').fill(details.petExperience);
  await fieldByLabel(form, 'Can you help now?').selectOption(details.availability);
  await fieldByLabel(form, 'Experience level').selectOption(details.experienceLevel);

  for (const petType of details.petTypes) {
    const pluralLabel: Record<typeof petType, string> = {
      Dog: 'Dogs',
      Cat: 'Cats',
      Rabbit: 'Rabbits',
      Bird: 'Birds',
      'Small mammal': 'Small mammals',
      Reptile: 'Reptiles',
      Fish: 'Fish',
      Other: 'Other pets',
    };
    await form.getByRole('button', { name: pluralLabel[petType], exact: true }).click();
  }

  for (const preferredSize of details.preferredSizes) {
    await form.getByRole('button', { name: preferredSize, exact: true }).click();
  }

  for (const flag of details.experienceFlags ?? []) {
    await checkboxByText(form, flag).check();
  }

  await page.getByRole('button', { name: 'Save Changes', exact: true }).click();
  await expect(page.getByText('Profile saved.')).toBeVisible();
}

export async function openAvailabilityPlanner(page: Page) {
  await page.goto('/profile');
  await page.getByRole('button', { name: /^Times I can help/ }).first().click();
  await expect(page.getByText('Your saved times')).toBeVisible();
}

export async function addAvailabilitySlot(
  page: Page,
  window: {
    startDate: string;
    endDate: string;
    startTime: string;
    endTime: string;
  }
) {
  await openAvailabilityPlanner(page);
  await page.getByRole('button', { name: 'Add time', exact: true }).click();

  await page.getByLabel('Start Date', { exact: true }).fill(window.startDate);
  await page.getByLabel('End Date', { exact: true }).fill(window.endDate);
  await page.getByLabel('Start Time', { exact: true }).fill(window.startTime);
  await page.getByLabel('End Time', { exact: true }).fill(window.endTime);
  await page.getByRole('button', { name: 'Add', exact: true }).click();

  await expect(page.getByText('Time slot added.')).toBeVisible();
}

export async function expectAvailabilityOverlapError(
  page: Page,
  window: {
    startDate: string;
    endDate: string;
    startTime: string;
    endTime: string;
  }
) {
  await page.getByRole('button', { name: 'Add time', exact: true }).click();
  await page.getByLabel('Start Date', { exact: true }).fill(window.startDate);
  await page.getByLabel('End Date', { exact: true }).fill(window.endDate);
  await page.getByLabel('Start Time', { exact: true }).fill(window.startTime);
  await page.getByLabel('End Time', { exact: true }).fill(window.endTime);
  await page.getByRole('button', { name: 'Add', exact: true }).click();

  await expect(page.getByText('This time overlaps one of your existing availability slots')).toBeVisible();
}

export async function addPet(
  page: Page,
  pet: {
    name: string;
    type: 'dog' | 'cat';
    breed: string;
    age: number;
    size: 'small' | 'medium' | 'large';
    notes: string;
    behaviour?: string;
    vaccinationStatus?: string;
  }
) {
  await page.goto('/pets');
  await page.getByRole('button', { name: /Add (?:your first )?pet/i }).first().click();

  const form = page.locator('form');
  await fieldByLabel(form, 'Pet name').fill(pet.name);
  await fieldByLabel(form, 'Pet type').selectOption(pet.type);
  await fieldByLabel(form, 'Breed').fill(pet.breed);
  await fieldByLabel(form, 'Age (years)').fill(String(pet.age));
  await fieldByLabel(form, 'Size').selectOption(pet.size);
  await fieldByLabel(form, 'Notes for the sitter').fill(pet.notes);

  if (pet.behaviour) {
    await fieldByLabel(form, 'Behaviour').fill(pet.behaviour);
  }

  if (pet.vaccinationStatus) {
    await fieldByLabel(form, 'Vaccination status').fill(pet.vaccinationStatus);
  }

  await checkboxByText(form, 'Friendly with dogs').check();
  await page.getByRole('button', { name: 'Add pet', exact: true }).click();
  await expect(page.getByText('Pet added.')).toBeVisible();
}

export async function editPetNotes(page: Page, petName: string, updatedNotes: string) {
  await page.goto('/pets');

  const petCard = page
    .locator('div')
    .filter({
      has: page.getByRole('heading', { name: petName, exact: true }),
    })
    .filter({
      has: page.getByRole('button', { name: 'Edit', exact: true }),
    })
    .first();

  await petCard.getByRole('button', { name: 'Edit', exact: true }).click();

  const form = page.locator('form');
  await fieldByLabel(form, 'Notes for the sitter').fill(updatedNotes);
  await page.getByRole('button', { name: 'Save pet', exact: true }).click();

  await expect(page.getByText('Pet saved.')).toBeVisible();
}
