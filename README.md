# TassuKaveri

This repository contains the live Next.js application and an archived legacy site.

## Repository Layout

- `app/`: Active Next.js 16 application for Vercel deployment
- `legacy-site/`: Archived static/PHP site kept only for reference
- `firestore.rules`: Firestore security rules for the Firebase project

## Local Development

```powershell
cd app
npm install
copy .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Production Build

```powershell
cd app
npm run build
npm run start
```

## Vercel Deployment

Deploy the `app/` directory as the Vercel project root.

- Framework preset: `Next.js`
- Root Directory: `app`
- Build Command: `npm run build`
- Output setting: default Next.js output

Set these environment variables in Vercel:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

## Notes

- `legacy-site/` should not be used as the Vercel root.
- Firebase debug logs and local env files are intentionally excluded from version control.
