# algosus — Firebase Cloud Functions

Backend for the algosus trading bot. Handles Gemini stock selection, Alpaca paper trading, scheduled buy/sell, and Firebase Realtime Database sync.

## Setup

1. Copy the environment template:

   ```bash
   cp .env.example .env
   ```

2. Fill in real values in `.env` (never commit this file).

3. Install dependencies and build:

   ```bash
   npm install
   npm run build
   ```

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | Yes | Gemini API for stock picks (`buy.ts`) |
| `GEMINI_MODEL` | No | Override default model (`gemini-3.6-flash`) |
| `ALPACA_API_KEY` | Yes | Alpaca paper trading API key |
| `ALPACA_SECRET_KEY` | Yes | Alpaca paper trading secret |
| `FB_DB_URL` | Yes | Firebase Realtime Database URL |
| `FUNCTIONS_API_KEY` | For manual triggers | Shared secret required as `x-api-key` header on the `buy`, `sell`, and `update` HTTP endpoints |

Alpaca is configured for **paper trading only** (`paper: true` in `config.ts`). Do not switch to live trading without explicit intent.

Firebase access uses the **admin SDK** with the Cloud Functions service account. For local emulator runs against the production database, authenticate with application default credentials first (`gcloud auth application-default login`) or set `GOOGLE_APPLICATION_CREDENTIALS` to a service-account key file.

## Local development

Start the functions emulator:

```bash
npm run serve
```

This builds TypeScript and runs `firebase emulators:start --only functions`. HTTP endpoints are available at:

```
http://127.0.0.1:5001/algosus/us-central1/<functionName>
```

To test the full stack, point the frontend at the local URL (see `AGENTS.md` → Frontend API URL).

## Deploy

```bash
npm run deploy
```

Runs `firebase deploy --only functions`. Requires Firebase CLI authentication and project access to `algosus`. Deploy only when explicitly requested — the repo uses **`main`** for all work; Vercel frontend auto-deploy is disabled via root `vercel.json`.

## Scheduled functions

| Function | Schedule | Timezone | Action |
|---|---|---|---|
| `scheduleBuy` | `0 10 * * 1` (Monday 10:00) | America/New_York | Gemini picks → Alpaca buy |
| `scheduleSell` | `50 15 * * 5` (Friday 15:50) | America/New_York | Close all positions → update profile |

## Function reference

| Export | Type | Source | Description |
|---|---|---|---|
| `getData` | HTTP | `getData.ts` | Return portfolio data from RTDB; refresh if stale |
| `update` | HTTP | `update.ts` | Force profile refresh from Alpaca |
| `buy` | HTTP | `buy.ts` | Manual buy (same logic as schedule) |
| `sell` | HTTP | `sell.ts` | Manual sell (same logic as schedule) |
| `scheduleBuy` | Scheduler | `buy.ts` | Weekly automated buy |
| `scheduleSell` | Scheduler | `sell.ts` | Weekly automated sell |

All exports are re-exported from `index.ts`.

## Scripts

| Script | Command |
|---|---|
| Lint | `npm run lint` |
| Build | `npm run build` |
| Emulator | `npm run serve` |
| Deploy | `npm run deploy` |
| Logs | `npm run logs` |
