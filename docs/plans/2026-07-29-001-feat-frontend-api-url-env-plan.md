---
title: Frontend API URL Env - Plan
type: feat
date: 2026-07-29
topic: frontend-api-url-env
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
product_contract_source: ce-brainstorm
execution: code
---

# Frontend API URL Env - Plan

## Goal Capsule

- **Objective:** Stop hand-editing `src/App.tsx` to switch the `getData` URL; use Vite env files per mode so local Vite hits the emulator and production builds hit the live Cloud Function.
- **Authority:** Product decisions from this brainstorm session. Prior docs deferred `VITE_API_URL` (agent onboarding / Phase 1 modernization); this contract settles the product shape.
- **Open blockers:** None.
- **Execution profile:** Committed mode env files + `import.meta.env.VITE_API_URL`; smoke via `npm run build` and grep of build output.
- **Tail ownership:** `ce-work` or manual implementation after plan approval.

---

## Product Contract

### Summary

Replace the hardcoded local/production URL flip in the frontend with Vite mode env files so `npm run dev` uses the emulator `getData` URL and production builds use the live Cloud Function URL, without editing source to switch.

### Problem Frame

Developers flip `const url = production` vs `local` in `src/App.tsx` every time they want the emulator. That friction slows local work against `getData` and is easy to forget mid-session. Safety of shipping localhost is secondary here; the primary pain is the edit cycle.

### Actors

- A1. Solo developer (Alan) running Vite locally and deploying the frontend via Vercel.

### Key Decisions

- Primary pain is friction, not deploy-safety (session-settled: user-directed — chosen over safety-as-main-driver: editing source every emulator session is the daily cost).
- Local Vite defaults to the emulator `getData` URL (session-settled: user-directed — chosen over production-by-default while developing: matches how local backend work is done).
- Mode split only — no escape hatch to hit production from local Vite without editing env (session-settled: user-directed — chosen over split-plus-override: override carrying cost not needed).
- Env files per Vite mode, not mode-automatic built-in URL constants (session-settled: user-directed — chosen over mode-automatic defaults: URLs should live outside UI code).

### Requirements

**URL selection**

- R1. The frontend must not require editing `src/App.tsx` (or equivalent app source) to choose local vs production `getData`.
- R2. `npm run dev` (Vite development mode) must use the Firebase emulator `getData` URL.
- R3. Production builds (`npm run build` and Vercel deploys) must use the live Cloud Function `getData` URL.
- R4. The two URLs are configured via Vite env files loaded by mode (development vs production).

**Developer setup**

- R5. A committed example or mode env template plus short docs must make first-time setup obvious so friction does not move from `App.tsx` to “which file do I create?”.

**Safety**

- R6. A production deploy must not use the localhost emulator URL.

### Key Flows

- F1. Local dashboard against emulator
  - **Trigger:** Developer runs `npm run dev` with the functions emulator available.
  - **Actors:** A1
  - **Steps:** Vite loads development-mode env; app fetches emulator `getData`; dashboard renders.
  - **Covered by:** R1, R2, R4
- F2. Production dashboard against live API
  - **Trigger:** Production build or Vercel deploy of the frontend.
  - **Actors:** A1 (as deployer)
  - **Steps:** Vite production mode loads production env; app fetches live Cloud Function `getData`.
  - **Covered by:** R3, R4, R6

### Acceptance Examples

- AE1. **Covers R2, R4.** After setup, `npm run dev` fetches `http://127.0.0.1:5001/algosus/us-central1/getData` (or the documented emulator equivalent) with no `App.tsx` edit.
- AE2. **Covers R3, R6.** `npm run build` output uses `https://us-central1-algosus.cloudfunctions.net/getData` (or the documented production equivalent).
- AE3. **Covers R1, R5.** A new clone can follow docs/example env files and hit the correct URL per mode without discovering the old `local`/`production` constants.

### Scope Boundaries

**In scope**

- Frontend `getData` URL configuration via Vite mode env files.
- Removing the hand-edited local/production constants from the fetch path.
- Example/template env file(s) and doc updates so setup is clear (`AGENTS.md`, safety/frontend notes as needed).

**Out of scope**

- Escape hatch or UI toggle to hit production from local Vite.
- Changing backend functions, schedules, or trading logic.
- Backend `functions/.env` layout.
- Runtime / preview-deploy backends other than the two known URLs.

### Success Criteria

- Switching local vs production no longer requires editing app source.
- `npm run dev` → emulator; production build/deploy → live API.
- First-time setup is documented with a committed template or mode env files.

### Assumptions

- The two `getData` URLs already used in `src/App.tsx` remain the correct targets.
- Public API base URLs are not secrets and may live in committed mode env files.
- Vercel production builds use Vite production mode so production env values apply without a separate dashboard secret for this URL.

**Product Contract preservation:** unchanged.

---

## Planning Contract

### Key Technical Decisions

- **KTD1. Committed mode env files.** Add root `.env.development` and `.env.production` with `VITE_API_URL` (session-settled: user-directed — env files per mode). URLs are public; no copy step for a fresh clone.

- **KTD2. `VITE_API_URL` in `App.tsx`.** Read `import.meta.env.VITE_API_URL` at fetch time; remove inline `local` / `production` constants (session-settled: user-directed — URLs outside UI code).

- **KTD3. Fail fast when unset.** If `VITE_API_URL` is missing or empty, log a clear error and surface fetch failure (do not fetch an empty URL).

- **KTD4. `.env.example` for discoverability.** Document the variable and both URLs; satisfies R5 alongside committed mode files.

### Assumptions

- Root `.gitignore` ignores only `.env` (exact name), not `.env.development` / `.env.production`.
- `npm run preview` uses production mode and therefore the live URL.

---

## Implementation Units

### U1. Mode env files and example template

- **Goal:** Commit development and production API URLs for Vite mode loading.
- **Requirements:** R2, R3, R4, R5, R6
- **Dependencies:** None
- **Files:** `.env.development`, `.env.production`, `.env.example`
- **Approach:** Set `VITE_API_URL` to emulator URL in development file and live Cloud Function URL in production file. `.env.example` lists both with comments.
- **Execution note:** Prefer install/runtime smoke over unit tests — config-only unit.
- **Patterns to follow:** `functions/.env.example` comment style.
- **Test scenarios:**
  - Test expectation: none — static env files; proof is build grep (Verification Contract).
- **Verification:** Files exist with correct URLs; not gitignored.

### U2. Wire `App.tsx` to `VITE_API_URL`

- **Goal:** Remove manual URL flip; read env at fetch time with fail-fast.
- **Requirements:** R1, R2, R3, R4
- **Dependencies:** U1
- **Files:** `src/App.tsx`, `src/vite-env.d.ts`
- **Approach:** Replace hardcoded constants with `import.meta.env.VITE_API_URL`; extend `vite-env.d.ts` with `VITE_API_URL` typing; on missing value set `fetchError` and skip fetch.
- **Patterns to follow:** Existing fetch/error handling in `src/App.tsx`.
- **Test scenarios:**
  - Covers AE1 / AE2 indirectly via build output grep.
  - Missing env: app shows error state instead of silent bad fetch.
- **Verification:** No `local`/`production` constants remain; `npm run build` passes.

### U3. Update agent and onboarding docs

- **Goal:** Docs describe env-based URL selection instead of manual `App.tsx` flip.
- **Requirements:** R5, AE3
- **Dependencies:** U1, U2
- **Files:** `AGENTS.md`, `README.md`, `.cursor/rules/safety.mdc`, `.cursor/rules/architecture.mdc`
- **Approach:** Replace manual-switch guidance with mode env file explanation; note dev → emulator default.
- **Test scenarios:**
  - Test expectation: none — documentation.
- **Verification:** No stale “flip `const url`” instructions remain in updated files.

---

## Verification Contract

| Gate | Command / action | Applies to |
|---|---|---|
| Production build | `npm run build` (repo root) | U2 |
| URL inlined in bundle | Grep `dist/assets/*.js` for production Cloud Function host after build | U1, U2 |
| Doc consistency | Manual scan of updated docs | U3 |

No `functions/` build or lint required.

---

## Definition of Done

- U1–U3 complete when R1–R6 and AE1–AE3 hold, `npm run build` passes, production bundle contains live API URL (not localhost), and docs no longer describe manual `App.tsx` switching.
- No new npm dependencies.
