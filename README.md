# TassuKaveri Repository Structure

This repository is organized into two parts:

- `app/`: Active Next.js platform (functional product)
- `legacy-site/`: Old static/PHP website kept for reference

## Run the Active Platform

```powershell
cd app
npm install
npm run dev
```

Open `http://localhost:3000`.

## Build for Production

```powershell
cd app
npm run build
npm run start
```

## Notes

- Firestore security rules are in `firestore.rules`.
- Legacy static/PHP files were moved out of root to keep the product codebase clean.
