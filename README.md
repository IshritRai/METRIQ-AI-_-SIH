# Packaged Commodity Compliance Checker

Screening-round demo for Legal Metrology field inspectors: scan a packaged commodity
label, extract the mandatory declarations, and get a compliance verdict against the
Legal Metrology (Packaged Commodities) Rules, 2011. See
[legal-metrology-compliance-mvp-prd-claude-code.md](legal-metrology-compliance-mvp-prd-claude-code.md)
for the full spec.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Get a free Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey)
   (no credit card needed for the free tier).
3. Copy `.env.example` to `.env` and fill in your key:
   ```bash
   cp .env.example .env
   ```
   ```
   GEMINI_API_KEY=your_key_here
   GEMINI_MODEL=gemini-2.5-flash
   ```
   `.env` is git-ignored — the key never gets committed, and the frontend never talks
   to Google directly (see `server/index.js`).

## Run

```bash
npm run dev
```

This starts both the Vite frontend (http://localhost:5173) and the Express backend
(http://localhost:8787) together. Vite proxies `/api/*` requests to the backend, so
just open http://localhost:5173.

- `npm run dev:client` — frontend only
- `npm run dev:server` — backend only
- `npm run build` — production build of the frontend

## Architecture

- `src/App.jsx` — the whole frontend (ported from `legal-metrology-demo.jsx`): scan
  flow, retake handling, compliance rules, dashboard, roadmap, error boundary.
- `server/index.js` — the only thing that talks to Gemini. Takes an image, calls
  `gemini-2.5-flash` server-side, returns the parsed JSON contract to the frontend.
- No database — scan history lives in React state, seeded on load, and resets on
  page reload (see PRD §7).
