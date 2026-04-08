# TassuKaveri App

This folder is the deployable Next.js application for TassuKaveri.

## Requirements

- Node.js 20+
- Firebase project with Web App credentials

## Environment Variables

Create a local env file before starting the app:

```powershell
copy .env.example .env.local
```

Required variables:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

## Development

```powershell
npm install
npm run dev
```

Open `http://localhost:3000`.

## Production

```powershell
npm run build
npm run start
```

## Vercel

If this repository is imported into Vercel, set the project root directory to this folder: `app/`.

The build has been verified locally with:

```powershell
npm run build
```
