# Three.js + Vue + Express Template

A minimal template with:

- Express backend API (`/api/health`)
- Vue frontend (Vite)
- Three.js interactive cube viewport with orbit controls

## Project structure

- `backend/` Express API server
- `frontend/` Vue + Three.js app
- `package.json` root scripts to run both apps

## Quick start

```powershell
npm install
npm run install:all
npm run dev
```

Then open `http://localhost:5173`.

## Production build

```powershell
npm run build
$env:NODE_ENV="production"
npm start
```

Then open `http://localhost:3000`.

## Notes

- In development, Vite proxies `/api/*` to the backend on port `3000`.
- In production, Express serves the built frontend from `frontend/dist`.

