# PetBuddy E2E Test Plan

## Feature Inventory

### Critical
- Authentication
  - `/login`: email/password login, invalid login handling, redirect to `/dashboard`
  - `/signup`: name, city, email, password, confirm password, client-side validation
  - protected route redirect via `ProtectedRoute`
- Profile and onboarding
  - `/profile`: tabbed account hub with `Personal Details`, `Availability Planner`, `Trust & Settings`
  - profile editing: name, city, country, bio, pet experience, availability, experience level, pet-type chips, size chips, care-experience flags
  - availability slot management through `AvailabilityPlanner`
  - phone verification UI is present
  - credit balance is visible on profile
- Pet management
  - `/pets`: add, edit, delete pet profiles
  - rich pet details: breed, age, size, notes, allergies, behaviour, medication, emergency vet
- Sitter discovery
  - `/sitters`: city, time window, distance, pet type, pet size, experience filters
  - sitter results show rating, availability summary, favorites, report action, public profile link
  - `/sitters/[sitterId]`: public sitter profile and direct `Create Request` CTA
- Booking workflow
  - `/exchange` and `/requests`: same exchange UI
  - request creation with pets, dates, times, notes, care instructions
  - automatic credits: `1 hour = 1 credit`, rounded up
  - separate exchange tabs: `My Requests`, `Direct Requests`, `Community Requests`, `My Sits`
  - owner accepts applicants, sitter accepts direct requests, sitter marks complete, owner confirms completion, owner submits review
- Messaging and notifications
  - `/messages`: conversation list, message thread, send message
  - `/notifications`: `Direct Requests` lane and `Other Activity` lane, mark as read, deep links
- Role restrictions
  - guest access blocked for protected pages
  - `/admin` exists and denies non-admins in UI

### Important
- `/dashboard`: credits, upcoming sits, sitter previews, community request previews
- favorites on sitter cards
- moderation/reporting
  - sitter reporting from sitter list
  - request reporting from community requests
- wallet/credit escrow and release
- public profile trust/rating summaries

### Secondary
- landing page marketing content
- localhost-only `/dev-tools/test-users`
- `/verify-email` redirect page
- advanced moderation tools for admins

## Role Model

- The app does **not** have separate owner and sitter auth roles.
- Most users are `role: "user"`.
- "Owner" behavior comes from creating pets and requests.
- "Sitter" behavior comes from completing profile details and availability, then applying or accepting sits.
- Only `admin` is a true distinct role in the data model.

## UI/API-Backed Features Found

- Firebase Auth drives signup/login/logout.
- Firestore collections back profiles, public profiles, pets, availability slots, requests, conversations/messages, wallet, notifications, favorites, and reports.
- There are no traditional REST API endpoints to seed or clean state.
- Existing seed support lives in `app/lib/testUserService.ts` and is exposed to the localhost-only dev tool.

## Gaps Between Requested Scope And Current Product

- No forgot/reset password UI exists.
- No real email verification flow exists; `/verify-email` is only a redirect.
- No dedicated owner-only vs sitter-only route model exists beyond behavior and state.
- Sitter search has no service-type filter and no sort controls.
- Reviews are summarized on profile pages, but the UI does not show a standalone review feed.
- Positive admin flow needs a seeded/promoted admin account; the first automation wave covers non-admin denial.

## What Will Be Automated First

1. Auth and protected-route behavior
2. Owner onboarding: profile + pet creation/editing
3. Sitter onboarding: profile + availability
4. Search and public profile discovery
5. Direct booking lifecycle across two users
6. Multi-user chat
7. Completion + review submission
8. Notification visibility in the booking lifecycle
9. Non-admin access restriction for `/admin`

## Implemented First-Wave Coverage

- `auth/auth.spec.ts`
  - guest redirect to login
  - signup validation
  - UI signup + logout + login roundtrip
  - invalid login
- `roles/access.spec.ts`
  - non-admin cannot use admin tools
- `onboarding/owner-onboarding.spec.ts`
  - owner profile update
  - pet create/edit
  - persistence after refresh
- `onboarding/sitter-onboarding.spec.ts`
  - sitter profile update
  - availability slot create
  - overlapping slot validation
  - public profile visibility
- `search/sitter-search.spec.ts`
  - sitter filters
  - empty state
  - reset via `Browse All`
  - open sitter profile
- `multi-user/direct-booking-chat-review.spec.ts`
  - owner direct request from sitter public profile
  - sitter alert visibility
  - direct request acceptance
  - owner sees accepted status
  - owner/sitter chat
  - sitter marks complete
  - owner confirms
  - owner leaves review
  - sitter public rating summary updates

## Assumptions

- A real Firebase project is configured through the existing `NEXT_PUBLIC_FIREBASE_*` variables.
- The test environment allows Firebase Auth/Firestore network access.
- Running locally on `localhost` or `127.0.0.1` is acceptable; the seed tool and config assume that.
- Pilot location logic remains active, so tests use `Oulu, Finland`.

## Risks And Testability Gaps

- There are almost no `data-testid` hooks in the current UI.
- Many labels are visually present but not programmatically associated with inputs, so `getByLabel()` is not reliable everywhere.
- No API cleanup endpoint exists, so true destructive cleanup is not automated.
- Firebase Storage-backed profile photo upload may fail if Storage is not enabled or Storage rules are not deployed.
- Native browser dialogs (`confirm`, `prompt`) are used in several flows, so tests must explicitly handle dialogs.

## Exact Testability Improvements Recommended

- Add `data-testid` to auth forms in:
  - `app/app/login/page.tsx`
  - `app/app/signup/page.tsx`
- Add stable ids/testids to profile editing controls in:
  - `app/app/profile/page.tsx`
  - `app/components/AvailabilityPlanner.tsx`
- Add stable ids/testids to pet CRUD controls in:
  - `app/app/pets/page.tsx`
- Add stable ids/testids to exchange tabs, request form, request cards, and lifecycle action buttons in:
  - `app/app/requests/page.tsx`
- Add stable ids/testids to sitter filter controls and sitter cards in:
  - `app/app/sitters/page.tsx`
  - `app/app/sitters/[sitterId]/page.tsx`
- Add stable ids/testids to message draft/send controls and notification cards in:
  - `app/app/messages/page.tsx`
  - `app/app/notifications/page.tsx`
- Associate visible labels with `id/htmlFor` pairs across forms so Playwright can use `getByLabel()` reliably and accessibility improves at the same time.
