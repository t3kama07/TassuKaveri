# TassuKaveri

This repository contains the live Next.js application and an archived legacy site.

## Repository Layout

- `app/`: Active Next.js 16 application for Vercel deployment
- `legacy-site/`: Archived static/PHP site kept only for reference

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

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Notes

- `legacy-site/` should not be used as the Vercel root.
- Local build artifacts, debug logs, and env files are intentionally excluded from version control.
