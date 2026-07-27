---
title: AI agent onboarding for pre-AI codebases
date: 2026-07-27
category: developer-experience
module: agent-onboarding
problem_type: developer_experience
component: documentation
severity: medium
applies_when:
  - "Starting AI-assisted work on a legacy repo with no agent context files"
  - "Every new Cursor session requires re-explaining architecture or data flow"
  - "The repo has a two-package or multi-surface layout agents cannot infer from folder names alone"
resolution_type: documentation_update
root_cause: inadequate_documentation
tags:
  - cursor
  - agents-md
  - developer-experience
  - firebase
  - documentation
---

# AI agent onboarding for pre-AI codebases

## Context

algosus is a React/Vite frontend plus Firebase Cloud Functions backend that runs an educational trading bot (OpenAI stock picks, Alpaca paper trading, Firebase Realtime Database). The repo was built before AI coding tools were common: no `AGENTS.md`, no `.cursor/rules`, no tests, and ESLint only under `functions/`.

The main friction was not missing features — it was **cold starts**. Every new AI session required re-explaining:

- The two-package layout (frontend vs `functions/`)
- The end-to-end trading flow (scheduled buy/sell, `getData`, RTDB sync, frontend fetch)
- Which env vars and deploy endpoints matter
- What not to touch (paper trading, production URL default in `src/App.tsx`)

## Guidance

Onboard agents with **embedded context** in files Cursor loads automatically, plus a small backend README and env template. Keep code churn minimal.

### 1. Root `AGENTS.md`

Single entry point for any agent. Include:

- Two-package table (paths, roles, core scripts)
- **Trading flow diagram** (mermaid) and numbered steps
- Function inventory (HTTP vs scheduler exports)
- Key file map (`buy.ts`, `sell.ts`, `update.ts`, `getData.ts`, `config.ts`, `App.tsx`)
- Frontend API URL guidance (`src/App.tsx` lines 25–27: `local` vs `production`)
- Explicit out-of-scope list (no trading logic changes without ask)

### 2. Cursor rules (`.cursor/rules/*.mdc`)

Split by concern so globs load only relevant context:

| File | Scope | Purpose |
|---|---|---|
| `architecture.mdc` | `alwaysApply: true` | Package layout, flow summary, scripts |
| `backend-functions.mdc` | `functions/**/*` | Function roles, env vars, RTDB note |
| `safety.mdc` | `functions/**/*`, `src/**/*` | Secrets, paper trading, deploy boundaries |

Embed the same facts as `AGENTS.md` — do not rely on links alone. Agents read rules on turn one.

### 3. Backend README + env template

- `functions/README.md` — env vars, schedules, emulator/deploy commands
- `functions/.env.example` — **all runtime keys** the backend needs to boot:

  `OPENAI_API_KEY`, `ALPACA_API_KEY`, `ALPACA_SECRET_KEY`, `FB_API_KEY`, `FB_DB_URL`

  Listing only the trading API keys leaves agents stuck when Firebase init fails.

### 4. Light structural fix (optional but cheap)

`functions/src/index.ts` mixed `export const` (HTTP functions) with `exports.scheduleBuy` (CommonJS). Unify on `export const` so the entrypoint reads consistently:

```typescript
// before
exports.scheduleBuy = ScheduleBuy;

// after
export const scheduleBuy = ScheduleBuy;
```

No behavior change — Firebase Functions v2 accepts both.

### What to defer

- Test suites, CI, dependency upgrades, root ESLint — high carrying cost, low cold-start payoff
- `VITE_API_URL` for frontend — document the hardcoded URL first; extract to env when local dev becomes frequent

## Why This Matters

Without agent context files, the model invents structure from partial reads — wrong package, wrong database (Firestore vs Realtime Database), wrong API URL. Embedded docs cost little to maintain and compound: the second session on the same repo starts warm.

Docs-only onboarding also avoids scope creep. The user chose "docs + light structure" over a full tooling refresh; that boundary keeps the diff reviewable.

## When to Apply

- Legacy or solo-maintained repos with no `AGENTS.md` / `.cursor/rules`
- Multi-package repos where data flow crosses HTTP boundaries (frontend → Cloud Function → DB → external APIs)
- Pain is **re-explaining flow**, not unsafe edits or inconsistent style (those need lint/tests later)

Skip this pattern when the repo already has agent rules, or when the fix is a one-line bug — use `ce-debug` instead.

## Examples

### Before (cold start)

Agent opens `src/App.tsx`, sees a fetch URL, guesses Firestore, misses scheduled functions in `buy.ts`/`sell.ts`. User pastes the trading flow every session.

### After (this repo)

Artifacts added on `main`:

- `AGENTS.md`
- `.cursor/rules/architecture.mdc`, `backend-functions.mdc`, `safety.mdc`
- `functions/README.md`, `functions/.env.example`
- `functions/src/index.ts` — unified exports

First prompt can target a feature because architecture and flow are in agent context.

### Env template completeness

```bash
# functions/.env.example — include Firebase keys, not just trading APIs
OPENAI_API_KEY=...
ALPACA_API_KEY=...
ALPACA_SECRET_KEY=...
FB_API_KEY=...
FB_DB_URL=...
```

### Pre-existing issues to document, not fix in onboarding pass

`functions/.eslintrc.js` uses ESM `export const` syntax but must be CommonJS `module.exports` for ESLint 8. `npm --prefix functions run lint` fails for this reason — note it in agent docs so agents do not blame onboarding changes.

## Related

- Plan: `docs/plans/2026-07-27-001-docs-agent-onboarding-plan.md`
- Agent entry: `AGENTS.md`
