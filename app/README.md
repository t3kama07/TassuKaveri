# TassuKaveri App

This folder is the deployable Next.js application for TassuKaveri.

## Requirements

- Node.js 20+
- Supabase project with browser and service-role credentials

## Environment Variables

Create a local env file before starting the app:

```powershell
copy .env.example .env.local
```

Required variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DB_URL`

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

## Supabase Integrity Audit

Run this before launch or after seeding users:

```powershell
npm run db:audit-integrity
```

This checks that app profiles still map to real Supabase Auth users and reports orphaned records that would break login.

## Vercel

If this repository is imported into Vercel, set the project root directory to this folder: `app/`.

The build has been verified locally with:

```powershell
npm run build
```
