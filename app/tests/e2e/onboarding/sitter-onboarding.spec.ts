import { expect, test } from '../fixtures/app.fixtures';
import { login } from '../helpers/auth';
import { buildFutureWindow } from '../helpers/date';
import {
  addAvailabilitySlot,
  completeProfile,
  expectAvailabilityOverlapError,
  openAvailabilityPlanner,
} from '../helpers/onboarding';

test.describe('Sitter Onboarding', () => {
  test('completes sitter profile, manages availability, and is visible on the public sitter page', async ({ page, appUsers, runId }) => {
    const sitter = appUsers.profileSitter;
    const sitterName = `Sitter ${runId}`;
    const availabilityWindow = buildFutureWindow(4, 9, 4);
    const overlappingWindow = {
      ...availabilityWindow,
      startTime: '10:00',
      endTime: '12:00',
    };

    await login(page, sitter);
    await completeProfile(page, {
      name: sitterName,
      bio: 'Structured sitter profile for automated testing with clear communication and calm care routines.',
      petExperience: 'Experienced with both cats and dogs, medication timing, and multi-pet homes.',
      availability: 'available',
      experienceLevel: 'expert',
      petTypes: ['Dog', 'Cat'],
      preferredSizes: ['Medium', 'Large'],
      experienceFlags: [
        'Experience with dogs',
        'Experience with cats',
        'Experience with large dogs',
        'Experience with senior pets',
      ],
    });

    await addAvailabilitySlot(page, availabilityWindow);
    await expectAvailabilityOverlapError(page, overlappingWindow);

    await page.reload();
    await openAvailabilityPlanner(page);
    await expect(page.getByText(`${availabilityWindow.startTime} - ${availabilityWindow.endTime} (4h)`)).toBeVisible();

    await page.goto(`/sitters/${sitter.uid}`);
    await expect(page.getByRole('heading', { name: sitterName, exact: true })).toBeVisible();
    await expect(page.getByText('Open for bookings')).toBeVisible();
    await expect(page.getByText('No reviews yet')).toBeVisible();
  });
});
