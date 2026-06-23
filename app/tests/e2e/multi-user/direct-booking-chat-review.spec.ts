import { expect, test } from '../fixtures/app.fixtures';
import { login } from '../helpers/auth';
import { buildFutureWindow } from '../helpers/date';
import {
  confirmNextDialog,
  createDirectRequestFromProfile,
  requestCardByText,
  sendChatMessage,
} from '../helpers/exchange';
import { fieldByLabel } from '../helpers/forms';
import { addAvailabilitySlot, addPet, completeProfile } from '../helpers/onboarding';

test.describe('Direct Booking, Chat, And Review', () => {
  test('completes the core owner-to-sitter lifecycle across two users', async ({ browser, appUsers, runId }) => {
    test.setTimeout(240_000);
    const owner = appUsers.bookingOwner;
    const sitter = appUsers.bookingSitter;
    const petName = `BookingPet-${runId}`;
    const ownerName = `Booking Owner ${runId}`;
    const sitterName = `Booking Sitter ${runId}`;
    const requestNote = `Direct request note ${runId}`;
    const ownerMessage = `Owner message ${runId}`;
    const sitterReply = `Sitter reply ${runId}`;
    const reviewComment = `Excellent sitter experience ${runId}`;
    const requestWindow = buildFutureWindow(6, 10, 2);
    const sitterAvailability = buildFutureWindow(6, 9, 4);

    const ownerContext = await browser.newContext();
    const sitterContext = await browser.newContext();
    const ownerPage = await ownerContext.newPage();
    const sitterPage = await sitterContext.newPage();

    try {
      await login(ownerPage, owner);
      await completeProfile(ownerPage, {
        name: ownerName,
        bio: 'Owner profile used for the critical direct booking automation path.',
        petExperience: 'Used to sharing clear instructions and confirming completed care quickly.',
        availability: 'unavailable',
        experienceLevel: 'intermediate',
        petTypes: ['Dog'],
        preferredSizes: ['Medium'],
        experienceFlags: [],
      });
      await addPet(ownerPage, {
        name: petName,
        type: 'dog',
        breed: 'Border Collie',
        age: 3,
        size: 'medium',
        notes: 'Needs a structured walk before lunch.',
      });

      await login(sitterPage, sitter);
      await completeProfile(sitterPage, {
        name: sitterName,
        bio: 'Sitter profile used for direct booking, chat, and review automation.',
        petExperience: 'Comfortable with walking, medication reminders, and owner handoffs.',
        availability: 'available',
        experienceLevel: 'expert',
        petTypes: ['Dog', 'Cat'],
        preferredSizes: ['Medium', 'Large'],
        experienceFlags: ['Confident handling large dogs'],
      });
      await addAvailabilitySlot(sitterPage, sitterAvailability);

      await ownerPage.goto(`/sitters/${sitter.uid}`);
      await expect(ownerPage.getByText('No reviews yet')).toBeVisible();

      await createDirectRequestFromProfile(ownerPage, {
        sitterUid: sitter.uid,
        petName,
        startDate: requestWindow.startDate,
        endDate: requestWindow.endDate,
        startTime: requestWindow.startTime,
        endTime: '09:00',
        location: 'Oulu',
        notes: requestNote,
      });

      await ownerPage.getByRole('button', { name: 'Ask for pet care', exact: true }).click();
      await expect(ownerPage.getByText('End date must be after start date')).toBeVisible();

      const requestForm = ownerPage.locator('form');
      await fieldByLabel(requestForm, 'End time').fill(requestWindow.endTime);
      await expect(fieldByLabel(requestForm, 'End time')).toHaveValue(requestWindow.endTime);
      await ownerPage.getByRole('button', { name: 'Ask for pet care', exact: true }).click();

      await expect(ownerPage.locator('form')).toHaveCount(0);
      await expect(ownerPage.getByText('Direct request sent to:')).toBeVisible();
      await expect(ownerPage.getByText(sitterName)).toBeVisible();

      await sitterPage.goto('/notifications');
      await expect(sitterPage.getByRole('heading', { name: 'Direct asks', exact: true })).toBeVisible();
      await expect(sitterPage.getByText(`${ownerName} sent you a direct request for ${petName}.`)).toBeVisible();
      await sitterPage.getByRole('button', { name: 'Mark as read', exact: true }).click();
      await expect(sitterPage.getByText('New')).toHaveCount(0);

      await sitterPage.getByRole('button', { name: 'Open direct requests', exact: true }).click();
      await expect(sitterPage).toHaveURL(/tab=direct-requests/);
      await confirmNextDialog(sitterPage);
      await sitterPage.getByRole('button', { name: 'Accept direct ask', exact: true }).click();
      await expect(sitterPage.getByText(`Direct pet-care request accepted for ${petName}.`)).toBeVisible();

      await ownerPage.goto('/exchange?tab=my-requests');
      const acceptedRequestCard = await requestCardByText(ownerPage, requestNote);
      await expect(acceptedRequestCard.getByText('Accepted')).toBeVisible();
      await expect(acceptedRequestCard.getByText(sitterName)).toBeVisible();

      await sendChatMessage(ownerPage, ownerMessage);

      await sitterPage.goto('/messages');
      await expect(sitterPage.getByText(ownerMessage, { exact: true }).last()).toBeVisible();
      await sitterPage.getByPlaceholder('Type a message...').fill(sitterReply);
      await sitterPage.getByRole('button', { name: 'Send', exact: true }).click();
      await expect(sitterPage.getByText('Message sent.')).toBeVisible();

      await ownerPage.goto('/messages');
      await expect(ownerPage.getByText(sitterReply, { exact: true }).last()).toBeVisible();

      await sitterPage.goto('/exchange?tab=my-sits');
      await confirmNextDialog(sitterPage);
      await sitterPage.getByRole('button', { name: 'Mark care as finished', exact: true }).click();
      await expect(sitterPage.getByText('Marked as finished. Waiting for the owner to confirm.')).toBeVisible();

      await ownerPage.goto('/exchange?tab=my-requests');
      await confirmNextDialog(ownerPage);
      await ownerPage.getByRole('button', { name: 'Confirm care is finished', exact: true }).click();
      await expect(ownerPage.getByText('Care confirmed. The sitter received the credits.')).toBeVisible();

      await ownerPage.locator('select').filter({ has: ownerPage.locator('option[value="5"]') }).first().selectOption('5');
      await ownerPage.getByPlaceholder('Short comment').fill(reviewComment);
      await ownerPage.getByRole('button', { name: 'Send review', exact: true }).click();

      await expect(ownerPage.getByText('Review sent. Thank you for helping the community.')).toBeVisible();
      await expect(ownerPage.getByText('Your review')).toBeVisible();
      await expect(ownerPage.getByText(reviewComment)).toBeVisible();

      await ownerPage.goto(`/sitters/${sitter.uid}`);
      await expect(ownerPage.getByText('1 reviews')).toBeVisible();
      await expect(ownerPage.getByText('5.0')).toBeVisible();
    } finally {
      await Promise.allSettled([ownerContext.close(), sitterContext.close()]);
    }
  });
});
