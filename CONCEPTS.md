# Concepts

> Shared domain vocabulary for this project — entities, named processes, and status concepts with project-specific meaning. Seeded with core domain vocabulary, then accretes as ce-compound and ce-compound-refresh process learnings; direct edits are fine. Glossary only, not a spec or catch-all.

## Trading

### Trading flow
The end-to-end path from scheduled or manual buy/sell through external APIs to persisted portfolio state and the frontend dashboard. Buy uses Gemini for ticker selection and Alpaca for orders; sell closes Alpaca positions; both paths call profile update before the UI reads data via the data API.

### scheduleBuy
The weekly scheduled Cloud Function that runs the automated buy path (Gemini stock pick, Alpaca buy orders, profile update). Triggers Monday mornings in US Eastern time.

### scheduleSell
The weekly scheduled Cloud Function that closes all Alpaca positions and refreshes the stored profile. Triggers Friday afternoons in US Eastern time.

### UpdateProfile
The shared backend process that reads the Alpaca account and positions, writes account equity and holdings to the realtime database, and appends a timeline entry. Invoked after trades and when portfolio data is stale.

### getData
The HTTP Cloud Function the frontend calls to load portfolio state. Reads the realtime database and may trigger UpdateProfile when cached data is stale.

## Packages

### Two-package layout
algosus splits into a Vite React frontend at the repo root and a Firebase Cloud Functions backend under `functions/`. Each has its own `package.json`; the frontend calls backend HTTP endpoints, not shared imports.

## Data

### Realtime Database
The Firebase persistence layer for account and timeline data in this project. Portfolio state lives under account and timeline nodes. Not Firestore.
