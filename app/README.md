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
