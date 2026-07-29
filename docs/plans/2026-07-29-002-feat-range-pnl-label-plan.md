---
title: Range P&L Label - Plan
type: feat
date: 2026-07-29
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
product_contract_source: ce-plan-bootstrap
execution: code
---

# Range P&L Label - Plan

## Goal Capsule

- **Objective:** Make the portfolio P&L stat label track the chart’s selected time range (Today / Past week / Past month / Past year / All time) instead of always saying All-time.
- **Authority:** This plan overrides the hardcoded `All-time` label. Repo safety rules in `.cursor/rules/safety.mdc` still apply (no trading-logic changes).
- **Stop conditions:** Stop if wiring range selection into the stats strip requires changing how timeline filtering or P&L math works — that is out of scope; escalate rather than expand.
- **Execution profile:** Small frontend UI sync; manual visual verification is the primary proof (no frontend test suite in repo).
- **Tail ownership:** `ce-work` or manual implementation after plan approval.

---

## Product Contract

### Summary

When a visitor selects a chart range (`1D` / `1W` / `1M` / `1YR` / `ALL`), the P&L label in the stats strip updates to Today / Past week / Past month / Past year / All time. Range buttons and filter behavior stay as they are; only the label text changes.

### Problem Frame

The stats strip’s P&L value already follows the filtered timeline (because `GraphHeader` updates `timeline` in `App`), but its label is hardcoded as `All-time`. After a shorter range is selected, the number is range-relative while the wording still claims all-time — a misleading mismatch.

### Requirements

- R1. The P&L stat label reflects the active chart range with this mapping: `1D` → Today, `1W` → Past week, `1M` → Past month, `1YR` → Past year, `ALL` → All time.
- R2. On initial load (default range ALL), the label shows All time.
- R3. Changing the range updates the label immediately with the chart/timeline update.
- R4. Range button labels (`1D`, `1W`, `1M`, `1YR`, `ALL`) and range filtering logic are unchanged.
- R5. P&L dollar and percent calculation semantics are unchanged (still derived from the filtered `timeline` already passed into the strip).

### Scope Boundaries

**In scope**

- Syncing the stats-strip P&L label with the selected chart range.
- Sharing selected-range state between the range controls and the stats strip.

**Out of scope**

- Renaming or redesigning the range buttons.
- Changing how ranges filter timeline points or how delta / percent is computed.
- Backend, trading schedules, or data API changes.
- Adding automated tests or CI (per project scope rules).

### Success Criteria

- Selecting each of the five ranges shows the matching label from R1.
- Default load shows All time.
- `npm run build` passes.

### Key Decisions

- **KD1. Plain-language labels** (session-settled: user-directed — chosen over button codes `1D`/`1W`/… or shorter Day/Week/Month forms: matches the requested Today / Past week / Past month / Past year / All time wording).
- **KD2. Label-only change** — range controls and P&L math stay as today; only the mismatched All-time string is fixed.

---

## Planning Contract

### Key Technical Decisions

- **KTD1. Lift selected range into `App` and treat `GraphHeader` as controlled.** Today `activeRange` is private state in `GraphHeader`, so `StatsStrip` cannot read it. Own `activeRange` (default `'ALL'`) in `App`, pass it into `GraphHeader` with a setter/callback used by `setRange`, and pass it into `StatsStrip` for the label. Rationale: `App` already owns `timeline` / `setTimeline`; range selection is the same shared UI concern. Prefer controlled props over Context or deriving the label by guessing from timeline length.

- **KTD2. Single map from range code to label string.** Keep a small lookup (`1D` → Today, …, `ALL` → All time) next to the strip or a shared constant used by the strip. Display the mapped string in place of the hardcoded `All-time`. Rationale: one source of truth for R1; avoids scattered conditionals. (session-settled label set from KD1.)

- **KTD3. Do not recompute P&L from `activeRange`.** Continue using filtered `timeline` for baseline/current equity as today. Rationale: preserves R5; the bug is wording, not math. Conflict call-out: `docs/plans/2026-07-27-004-feat-modern-mobile-ui-plan.md` KTD4 intended a fixed since-start delta (ALL parity), but the shipped strip already baselines on filtered `timeline[0]` — so the number is already range-relative. This plan aligns the label with that runtime behavior; it does **not** restore since-start-only math.

### Assumptions

- Scope was confirmed in the preceding brainstorm turn (no separate requirements-only file on disk); Product Contract above captures that dialogue.
- “All time” (two words, no hyphen) is the intended ALL label, replacing the current `All-time` hyphenation.
- Loading skeletons need no range-aware copy (label appears only when the strip is fully rendered).
- `.stat-label` in `src/App.css` uppercases via CSS — keep source strings in normal case (`Today`, `Past week`, …); do not pre-uppercase them.

### Product Contract preservation

Product Contract written in this bootstrap from the brainstorm session; no prior requirements-only artifact to preserve in place.

---

## Implementation Units

### U1. Share active range from App into GraphHeader

- **Goal:** Make the selected range visible at `App` so the stats strip can consume it.
- **Requirements:** R2, R3, R4
- **Dependencies:** None
- **Files:** `src/App.tsx`, `src/Graph.tsx`, `src/GraphHeader.tsx`
- **Approach:** Add `activeRange` state in `App` defaulting to `'ALL'`. Thread `activeRange` and `setActiveRange` (or an equivalent callback) through `Graph` into `GraphHeader`. Convert `GraphHeader`’s local `useState` for `activeRange` into controlled props; keep `setRange` filtering logic identical, only using the parent setter for the active code. Do not change `RANGES`, day thresholds, or edge-case timeline padding.
- **Execution note:** Prefer runtime smoke over unit coverage — no frontend test suite in this repo.
- **Patterns to follow:** Existing `timeline` / `setTimeline` prop drilling from `App` → `Graph` → `GraphHeader`.
- **Test scenarios:**
  - Happy path: load dashboard — ALL is the pressed range control (same as today).
  - Happy path: click `1W` — that button stays active (`aria-pressed` / `range-active`) and timeline still filters to ~7 days as before.
  - Regression: empty-range and single-point edge cases in `setRange` still behave as before.
- **Verification:** Range buttons still filter the chart; `npm run build` succeeds after U2 if shipped together.

### U2. Map active range to P&L label in StatsStrip

- **Goal:** Replace the hardcoded All-time label with the R1 mapping driven by `activeRange`.
- **Requirements:** R1, R2, R3, R5
- **Dependencies:** U1
- **Files:** `src/App.tsx` (`StatsStrip`)
- **Approach:** Pass `activeRange` into `StatsStrip`. Replace `<span className="stat-label">All-time</span>` with the mapped label from KTD2. Leave equity/holdings labels and delta computation untouched.
- **Execution note:** Visual smoke across all five ranges; confirm dollar/% still move with the chart (unchanged math).
- **Patterns to follow:** Inlined `StatsStrip` in `App.tsx` (single consumer; keep it there unless a split is already underway).
- **Test scenarios:**
  - Happy path: ALL → label All time; `1D` → Today; `1W` → Past week; `1M` → Past month; `1YR` → Past year.
  - Happy path: Covers R3 — after each click, label and chart update together.
  - Regression: Covers R5 — switching ranges still changes the P&L value when the filtered timeline’s first/last equity differ; Equity and Holdings labels unchanged.
  - Edge case: loading skeletons still show with no misleading All-time label requirement (skeleton-only strip).
- **Verification:** All five labels match R1 at desktop and ~390px widths; `npm run build` passes.

---

## Verification Contract

| Gate | Command / action | Applies to |
|---|---|---|
| Typecheck + production build | `npm run build` (repo root) | U1, U2 |
| Visual smoke | `npm run dev` — click each of `1D`, `1W`, `1M`, `1YR`, `ALL` and confirm label + chart | U1, U2 |

No `functions/` build or lint required — backend untouched.

---

## Definition of Done

- U1 and U2 complete when R1–R5 are met, visual smoke passes for all five ranges, and `npm run build` passes.
- No changes to range filter math, trading logic, or backend.
- No new dependencies.
- No unrelated refactors beyond the controlled-range wiring needed for the label.

---

## Sources & Research

- Brainstorm dialogue (2026-07-29): label set and label-only scope.
- Prior related plan: `docs/plans/2026-07-27-004-feat-modern-mobile-ui-plan.md` (stats strip owns P&L; `GraphHeader` owns range controls; KTD4 since-start intent vs current filtered-timeline behavior — see KTD3 call-out).
- Local pattern: `timeline` / `setTimeline` prop drill in `src/App.tsx`, `src/Graph.tsx`, `src/GraphHeader.tsx`; `activeRange` today is local to `GraphHeader` only.
- No `docs/solutions/` entry for StatsStrip ↔ range sync; graph axis/tooltip solution docs are tangential.
- External research: skipped — local UI pattern is sufficient.
