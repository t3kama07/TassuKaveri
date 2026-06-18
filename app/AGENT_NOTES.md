# AGENT_NOTES

## Pages changed
- Dashboard, requests/exchange, sitter search, sitter profile, profile, pets, messages, notifications, admin, login, signup, forgot password, reset password.
- Shared components changed: ProtectedRoute and AvailabilityPlanner.

## Main text simplifications
- Changed user-facing request language to action-based wording: "Ask for pet care," "Offer to help," "Direct asks," and "Open requests."
- Replaced visible escrow wording with "reserved credits" explanations.
- Simplified error messages so users see what to do next before technical details.
- Changed trust wording from "Trust score" toward "Trust level" and "Profile strength."

## Onboarding improvements
- Added a dashboard onboarding section with a five-step checklist.
- Added the first-use choice: "I need pet care," "I want to help as a sitter," and "I want to do both."
- Saved the onboarding choice in localStorage to avoid database schema changes.
- Added next actions based on profile completion, pets, availability, and active requests.

## Accessibility improvements
- Kept existing labels connected through wrapped labels or nearby visible labels.
- Improved disabled message text for chat access.
- Added clearer empty states and action buttons for pets, requests, messages, notifications, and sitter search.

## Known issues not fixed
- Some lower-level service and API errors still contain technical wording because they are not directly shown as primary UI copy in normal flows.
- Native confirm/prompt dialogs are still used because no shared custom modal component was found in the app.
- Existing Finnish public copy appears mojibake-encoded in source; this pass did not repair localization encoding.

## Tests run
- `npx tsc --noEmit` passed.
- `npm run build` passed.
- `npm run lint` was run. It still fails on existing lint errors outside this copy pass: `components/Navbar.tsx`, `contexts/LanguageContext.tsx`, and `tests/e2e/fixtures/app.fixtures.ts`. Touched `pets/page.tsx` explicit-any errors were fixed.
- `npm run test:e2e` was started.

## Tests not run and why
- Playwright did not complete within the 4-minute command timeout, so no e2e pass/fail result is available from this run.
