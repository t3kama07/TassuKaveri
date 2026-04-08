import { expect, test } from '../fixtures/app.fixtures';
import { login } from '../helpers/auth';
import { addPet, completeProfile, editPetNotes } from '../helpers/onboarding';

test.describe('Owner Onboarding', () => {
  test('updates profile, creates a pet, edits it, and keeps data after refresh', async ({ page, appUsers, runId }) => {
    const owner = appUsers.profileOwner;
    const ownerBio = `Owner profile bio for run ${runId}`;
    const petName = `Milo-${runId}`;
    const updatedNotes = `Updated breakfast routine for ${petName}`;

    await login(page, owner);
    await completeProfile(page, {
      name: `Owner ${runId}`,
      bio: ownerBio,
      petExperience: 'Comfortable with daily care routines, medication reminders, and detailed sitter handoffs.',
      availability: 'unavailable',
      experienceLevel: 'intermediate',
      petTypes: ['Dog'],
      preferredSizes: ['Medium'],
      experienceFlags: ['Experience with dogs'],
    });

    await page.reload();
    await expect(page.getByText(ownerBio).first()).toBeVisible();
    await expect(page.getByText('Credits')).toBeVisible();

    await addPet(page, {
      name: petName,
      type: 'dog',
      breed: 'Finnish Lapphund',
      age: 4,
      size: 'medium',
      notes: 'Friendly and happiest after a calm morning walk.',
      behaviour: 'Curious and social',
      vaccinationStatus: 'Up to date',
    });

    await page.reload();
    await expect(page.getByRole('heading', { name: petName, exact: true })).toBeVisible();

    await editPetNotes(page, petName, updatedNotes);
    await page.reload();

    await expect(page.getByText(updatedNotes)).toBeVisible();
  });
});
