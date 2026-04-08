import { expect, test } from '../fixtures/app.fixtures';
import { login, logout } from '../helpers/auth';
import { buildFutureWindow } from '../helpers/date';
import { fieldByLabel } from '../helpers/forms';
import { addAvailabilitySlot, completeProfile } from '../helpers/onboarding';

test.describe('Sitter Search And Discovery', () => {
  test('filters sitters, shows empty states, resets filters, and opens public profiles', async ({ page, appUsers, runId }) => {
    const sitter = appUsers.searchSitter;
    const owner = appUsers.searchOwner;
    const sitterName = `Search Sitter ${runId}`;
    const window = buildFutureWindow(5, 10, 3);

    await login(page, sitter);
    await completeProfile(page, {
      name: sitterName,
      bio: 'Searchable sitter profile with dog and cat experience for filter coverage.',
      petExperience: 'Happy to handle walking, feeding, and medication for time-boxed requests.',
      availability: 'available',
      experienceLevel: 'expert',
      petTypes: ['Dog', 'Cat'],
      preferredSizes: ['Medium', 'Large'],
      experienceFlags: ['Experience with dogs', 'Experience with cats'],
    });
    await addAvailabilitySlot(page, window);
    await logout(page);

    await login(page, owner);
    await page.goto('/sitters');

    await fieldByLabel(page, 'Need Care From').fill(window.startDateTimeLocal);
    await fieldByLabel(page, 'Need Care Until').fill(window.endDateTimeLocal);
    await fieldByLabel(page, 'Pet Type').selectOption('dog');
    await fieldByLabel(page, 'Experience').selectOption('expert');
    await page.getByRole('button', { name: 'Find Sitters', exact: true }).click();

    await expect(page.getByText(sitterName)).toBeVisible();

    await fieldByLabel(page, 'City').fill('Tampere');
    await page.getByRole('button', { name: 'Find Sitters', exact: true }).click();
    await expect(page.getByText(/No sitters are open for bookings/i)).toBeVisible();

    await fieldByLabel(page, 'City').fill('Oulu');
    await page.getByRole('button', { name: 'Browse All', exact: true }).click();
    await expect(page.getByText(sitterName)).toBeVisible();

    const sitterProfileLink = page.locator(`a[href="/sitters/${sitter.uid}"]`).first();
    await expect(sitterProfileLink).toBeVisible();
    await sitterProfileLink.click();

    await expect(page).toHaveURL(new RegExp(`/sitters/${sitter.uid}$`));
    await expect(page.getByRole('heading', { name: sitterName, exact: true })).toBeVisible();
  });
});
