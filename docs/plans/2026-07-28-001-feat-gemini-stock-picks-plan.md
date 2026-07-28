---
title: Gemini Stock Picks Pivot - Plan
type: feat
date: 2026-07-28
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
product_contract_source: ce-plan-bootstrap
execution: code
---

# Gemini Stock Picks Pivot - Plan

## Goal Capsule

- **Objective:** Replace OpenAI with Google Gemini (official `@google/genai` SDK, free tier) as the LLM that picks the weekly stock tickers, removing OpenAI from the codebase entirely while leaving prompt text, schedules, parsing, and all trading logic unchanged.
- **Authority:** This plan's Product Contract; repo safety rules (`.cursor/rules/safety.mdc`) — paper trading only, no schedule/prompt/logic changes beyond the provider swap.
- **Stop conditions:** Stop if the Gemini SDK cannot reproduce the current call behavior (plain-text response the existing ticker parser can consume), or if any change would require altering trading logic or schedules.
- **Tail ownership:** Plan ends at local verification (build + lint). Deploying and setting the production `GEMINI_API_KEY` are manual follow-ups owned by the user (see Operational Notes).

---

## Product Contract

### Summary

Swap the buy path's stock-pick LLM from OpenAI to Gemini: new client and env var in the backend config, the one LLM call in the buy flow rewritten against `@google/genai` with identical prompt and parsing behavior, `openai` dependency removed, and every living doc surface that names OpenAI updated.

### Problem Frame

OpenAI no longer offers free API access, so the weekly `scheduleBuy` run — the only LLM call in the project — now depends on a paid key. The Gemini API free tier covers Flash-family models with no credit card (~10 requests/minute, ~1,500/day; this bot makes one call per week), making it a durable free replacement. The OpenAI footprint is one Responses API call in `functions/src/buy.ts`, the client in `functions/src/config.ts`, the `OPENAI_API_KEY` env var, and doc references.

### Requirements

**Provider swap**

- R1. The buy flow's ticker selection calls Gemini through the official `@google/genai` SDK instead of OpenAI.
- R2. The prompt text sent to the model is byte-identical to the current prompt in `functions/src/buy.ts`.
- R3. Ticker parsing (`getTickerSymbols`) and the fail-loud behavior on zero valid tickers are unchanged.
- R4. The `openai` npm dependency is removed from `functions/package.json`.

**Configuration**

- R5. `GEMINI_API_KEY` replaces `OPENAI_API_KEY` in the fail-fast required-env check in `functions/src/config.ts`.
- R6. The Gemini model ID defaults to a current free-tier Flash model and can be overridden via an optional `GEMINI_MODEL` env var without a code change.

**Documentation**

- R7. All living docs that describe the OpenAI integration reflect Gemini: `functions/.env.example`, `functions/README.md`, `AGENTS.md`, `.cursor/rules/backend-functions.mdc`, `.cursor/rules/architecture.mdc`, `.cursor/rules/safety.mdc`, `CONCEPTS.md`.

### Scope Boundaries

- No multi-provider abstraction or OpenAI fallback — clean single-provider swap.
- No changes to trading schedules, buy/sell logic, Alpaca paper-trading config, or the frontend.
- No structured/JSON output mode — the plain-text prompt and regex parser stay as-is.
- No test suite or CI additions (repo policy: explicit request required).
- Historical artifacts (`docs/plans/`, `docs/solutions/`) keep their OpenAI mentions — they are point-in-time records.
- Deploying to Firebase is out of scope; it happens only on explicit user request.

---

## Planning Contract

### Key Technical Decisions

- **KTD1 — Official `@google/genai` SDK.** (session-settled: user-directed — chosen over Gemini's OpenAI-compat endpoint and a raw REST fetch: honestly-named official dependency; the compat layer is beta and only covers Chat Completions, so the Responses API call would need rewriting either way.)
- **KTD2 — Full OpenAI removal, no fallback.** (session-settled: user-approved — chosen over keeping OpenAI as a fallback: the free tier ending removes any reason to keep the dependency or key.)
- **KTD3 — Prompt, parsing, and schedules unchanged.** (session-settled: user-approved — chosen over adopting Gemini structured output: the provider swap must not change trading behavior; the existing parser is already defensive.)
- **KTD4 — Model ID: `gemini-3.6-flash` default, `GEMINI_MODEL` env override.** Free-tier model IDs churn (2.5 → 3 → 3.6 within a year), so an optional override survives deprecations without a redeploy while keeping zero new required config. The default matches the model Google's own docs currently use for free-tier examples; verify the exact current ID at implementation time against [ai.google.dev pricing](https://ai.google.dev/gemini-api/docs/pricing). Surfaced at scoping; resolved by the agent.
- **KTD5 — Generation parameters carried over where meaningful.** Keep `temperature: 0.8` and `maxOutputTokens: 512` in the `config` object; drop `topP: 1` and the empty `reasoning`/`tools`/`store` fields, which were OpenAI-shape noise at default values.

### Assumptions

- The Gemini free tier remains available for Flash models on API keys from Google AI Studio without billing enabled. Free-tier prompts may be used by Google to improve products — acceptable here (prompt contains no secrets or personal data).
- `response.text` may be `undefined` in the SDK's typings; treating it as empty string flows into the existing zero-tickers error path, which is the desired fail-loud behavior.

### Sources & Research

- Current call site: `functions/src/buy.ts` (`Openai.responses.create`, model `gpt-4.1-nano`); client and env check: `functions/src/config.ts`.
- SDK shape verified against [js-genai docs](https://googleapis.github.io/js-genai/release_docs/index.html): `new GoogleGenAI({apiKey})`, `ai.models.generateContent({model, contents, config})`, response text on `response.text`. Latest published version at planning time: `@google/genai` 2.13.0.
- Free-tier limits (July 2026): Flash models ~10 RPM / ~1,500 RPD, no credit card; enabling billing on the project removes the free tier — keep the key on a no-billing project.

---

## Implementation Units

### U1. Swap the LLM client from OpenAI to Gemini

- **Goal:** The buy flow picks tickers via Gemini; OpenAI is gone from code and dependencies.
- **Requirements:** R1, R2, R3, R4, R5, R6 (KTD1, KTD4, KTD5)
- **Dependencies:** none
- **Files:** `functions/package.json`, `functions/package-lock.json` (regenerated), `functions/src/config.ts`, `functions/src/buy.ts`
- **Approach:** Remove `openai`, add `@google/genai` (^2.13.0). In `config.ts`: replace the `OpenAI` import and `Openai` export with a `GoogleGenAI` client constructed from `GEMINI_API_KEY`; swap `OPENAI_API_KEY` for `GEMINI_API_KEY` in `requiredEnv`; export the resolved model ID (`process.env.GEMINI_MODEL` falling back to the default). In `buy.ts`: replace the `responses.create` call with `generateContent`, passing the existing prompt text verbatim as `contents` (the system/user role distinction is immaterial for this single-shot prompt) and `temperature`/`maxOutputTokens` in `config`; feed `response.text ?? ''` into the unchanged `getTickerSymbols`, keeping the existing zero-tickers throw (update its message to say Gemini). Directional guidance, not spec — follow current SDK docs at implementation.
- **Patterns to follow:** Existing `config.ts` client-export style (`Openai`, `AlpacaClient`); existing fail-fast `requiredEnv` check; existing error-propagation comments in `buy.ts`.
- **Test scenarios:** Test expectation: none — repo has no test suite and repo policy forbids adding tests/CI without explicit request. Behavior is verified via build, lint, and the optional emulator smoke below.
- **Verification:** `npm run build` and `npm run lint` pass (run with `functions/` as the working directory). `rg -i openai functions/src functions/package.json` returns nothing. Optional manual smoke: with a real key in `functions/.env`, start the emulator and hit `buy` with the `x-api-key` header — note this places real paper-trade orders on Alpaca, so only run it deliberately.

### U2. Update the environment contract

- **Goal:** Env template and backend README describe the Gemini key instead of the OpenAI key.
- **Requirements:** R7 (partial), supports R5/R6
- **Dependencies:** U1
- **Files:** `functions/.env.example`, `functions/README.md`
- **Approach:** In `.env.example`: replace the OpenAI block with `GEMINI_API_KEY` (note: free key from Google AI Studio, no card required) and a commented optional `GEMINI_MODEL` override. In `README.md`: update the env-var table row and any OpenAI/ChatGPT mentions to Gemini, including where the key comes from.
- **Test scenarios:** Test expectation: none — documentation-only unit.
- **Verification:** `.env.example` lists `GEMINI_API_KEY` (required) and `GEMINI_MODEL` (optional); no OpenAI or ChatGPT references remain in either file.

### U3. Update project docs and agent rules

- **Goal:** Agent-facing docs describe the Gemini-based trading flow so future sessions aren't misdirected.
- **Requirements:** R7
- **Dependencies:** U1
- **Files:** `AGENTS.md`, `.cursor/rules/backend-functions.mdc`, `.cursor/rules/architecture.mdc`, `.cursor/rules/safety.mdc`, `CONCEPTS.md`
- **Approach:** Replace OpenAI/gpt-4.1-nano references with Gemini and the new model default: AGENTS.md stack table (`OpenAI SDK 4.x` → `@google/genai 2.x`), trading-flow diagram and prose, required-env lists in `backend-functions.mdc`, the flow summary in `architecture.mdc`, the "OpenAI prompts" phrasing in `safety.mdc` (becomes "LLM prompts" or "Gemini prompts"), and the `Trading flow` / `scheduleBuy` entries in `CONCEPTS.md`.
- **Test scenarios:** Test expectation: none — documentation-only unit.
- **Verification:** `rg -i "openai|chatgpt"` across these five files returns nothing; diagrams and env-var lists match the post-U1 code.

---

## Verification Contract

| Gate | Command | Working directory | Applies to |
|---|---|---|---|
| Backend build | `npm run build` | `functions/` | U1 |
| Backend lint | `npm run lint` | `functions/` | U1 |
| OpenAI residue check | `rg -i "openai|chatgpt"` over `functions/src/`, `functions/package.json`, `functions/.env.example`, `functions/README.md`, `AGENTS.md`, `.cursor/rules/`, `CONCEPTS.md` | repo root | U1–U3 |

Run build and lint from inside `functions/` — `npm --prefix functions run lint` from the repo root can silently lint nothing on Windows. The frontend is untouched; the root build is not required. No test suite exists and none is added (repo policy).

---

## Definition of Done

- All three units complete; backend build and lint pass from `functions/`.
- No OpenAI or ChatGPT references remain in source, config templates, or living docs (historical `docs/plans/` and `docs/solutions/` entries excepted).
- `functions/.env.example` documents `GEMINI_API_KEY` and the optional `GEMINI_MODEL` override.
- No dead or experimental code from the swap remains in the diff.

---

## Operational Notes

Post-merge steps owned by the user (out of plan scope, listed for the runbook):

1. Create a free Gemini API key in [Google AI Studio](https://aistudio.google.com/) on a project **without billing enabled** (enabling billing removes the free tier).
2. Add `GEMINI_API_KEY` to `functions/.env` and remove `OPENAI_API_KEY`.
3. Deploy on explicit request: `npm --prefix functions run deploy`. Until deployed with the new key, the currently-deployed function still calls OpenAI and the Monday 10:00 ET scheduled buy will fail.
4. If Google deprecates the default model, set `GEMINI_MODEL` in `functions/.env` and redeploy — no code change needed.
