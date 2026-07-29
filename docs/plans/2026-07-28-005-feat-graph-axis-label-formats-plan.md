---
title: Graph Axis Label Formats - Plan
type: feat
date: 2026-07-28
topic: graph-axis-label-formats
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
product_contract_source: ce-plan-bootstrap
execution: code
---

# Graph Axis Label Formats - Plan

## Goal Capsule

- **Objective:** Show month+year on the x-axis, and format y-axis dollars from peak−trough variance using the agreed tier table.
- **Authority:** Builds on `docs/plans/2026-07-28-003-feat-graph-axes-plan.md` and `docs/plans/2026-07-28-004-feat-graph-axis-tick-density-plan.md`. Keep size-responsive tick counts and classic-clean styling.
- **Stop conditions:** Stop if month-year x labels collide at dense tick counts, or if full-dollar y labels clip the left margin.
- **Execution profile:** Small formatter changes in `src/Graph.tsx`; visual smoke is primary proof.
- **Tail ownership:** `ce-work` or manual implementation after plan approval.

---

## Product Contract

### Summary

Change x-axis ticks to month and year only (e.g. `Jul 2026`). Replace the binary y-axis `$k` rule with a variance-tier formatter: full dollars for very tight ranges, one-decimal `$k` for small-to-medium ranges, whole `$k` for wide ranges.

### Problem Frame

X-axis still shows month+day (`Jul 6`), which is noisier than needed once tick density increased. Y-axis uses a single cutoff (`range < 1000` → one decimal; else whole `$k`), which is too coarse: sub-$100 swings need full dollars, and `$1k`–`$10k` swings still need tenths (e.g. `$102.3k`).

### Key Decisions

- **X labels are month + year** (session-settled: user-directed — chosen over month+day).
- **Y precision follows peak−trough variance tiers** (session-settled: user-directed — confirmed table as-is, including 1 decimal for `$1k`–`$10k` range).

### Requirements

**X-axis**

- R1. X-axis tick labels show abbreviated month and four-digit year (e.g. `Jul 2026`), with no day-of-month.
- R2. Size-responsive x tick counts from plan 004 remain in place.

**Y-axis (variance = `yMax − yMin` on the visible timeline)**

- R3. If variance **&lt; $100**: labels use full dollars with thousands separators where helpful (e.g. `$3,045`, `$3,080`).
- R4. If variance **≥ $100 and &lt; $10,000**: labels use `$k` with **one decimal** (e.g. `$3.1k`, `$102.3k`).
- R5. If variance **≥ $10,000**: labels use whole `$k` (e.g. `$100k`, `$120k`).
- R6. Every y tick in a given render uses the same tier (chosen once from variance).

**Regression**

- R7. Tick density, muted classic-clean styling, line, and tooltip formatting stay as they are (tooltip may keep full `toFixed(2)`).

### Acceptance Examples

- AE1. **Covers R1.** Timeline spanning several months → x ticks read `Jul 2026`, `Aug 2026` (not `Jul 6`).
- AE2. **Covers R3.** Peak `$3,180`, trough `$3,140` (range `$40`) → y ticks like `$3,140`, `$3,160`.
- AE3. **Covers R4.** Peak `$3,180`, trough `$2,980` (range `$200`) → `$3.0k`, `$3.1k`.
- AE4. **Covers R4.** Peak `$104,200`, trough `$100,100` (range `$4,100`) → `$100.1k`, `$104.2k`-style tenths.
- AE5. **Covers R5.** Peak `$140k`, trough `$100k` (range `$40k`) → `$100k`, `$120k`, `$140k`.

### Scope Boundaries

**In scope**

- `formatDateAxis` and `formatEquityAxis` (and the variance decision) in `src/Graph.tsx`.

**Out of scope**

- Changing tick-count px constants.
- `$M` formatting for multi-million ranges.
- Tooltip copy changes.
- Gridlines or axis style changes.

### Success Criteria

- X-axis never shows a day number.
- Y-axis matches AE2–AE5 for the three variance bands.
- `npm run build` passes; labels readable at desktop and ~375px.

---

## Planning Contract

### Key Technical Decisions

- **KTD1. X format via `Intl` month+year.** Replace `{ month: 'short', day: 'numeric' }` with `{ month: 'short', year: 'numeric' }` (e.g. `Jul 2026`).

- **KTD2. Three-tier variance formatter.** Compute `range = yMax - yMin` once per draw:
  - `range < 100` → `` `$${Math.round(n).toLocaleString('en-US')}` `` (full dollars)
  - `100 <= range < 10000` → `` `$${(n / 1000).toFixed(1)}k` ``
  - `range >= 10000` → `` `$${Math.round(n / 1000)}k` ``
  Drop the old boolean `useDecimalK = range < 1000`.

- **KTD3. Left margin only if needed.** Full-dollar labels (`$10,055`) are wider; after smoke, bump `margin.left` if clipped.

### Assumptions

- Variance uses raw data min/max (not padded scale domain), same as plan 004.
- Merged `$100`–`$1k` and `$1k`–`$10k` into one “one decimal `$k`” band per the confirmed table (rows 2–3 both use 1 decimal).

---

## Implementation Units

### U1. X-axis month + year labels

- **Goal:** Show `Mon YYYY` on the x-axis.
- **Requirements:** R1, R2, R7
- **Dependencies:** None
- **Files:** `src/Graph.tsx`
- **Approach:** Update `formatDateAxis` to `Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' })`.
- **Execution note:** Visual check — no day digits on x ticks.
- **Patterns to follow:** Existing `formatDateAxis` in `src/Graph.tsx`.
- **Test scenarios:**
  - Covers AE1. Multi-month timeline → labels like `Jul 2026`.
  - Regression: x tick count still scales with width.
- **Verification:** AE1; `npm run build` succeeds.

### U2. Three-tier variance y-axis formatter

- **Goal:** Apply the confirmed peak−trough tiers to every y tick.
- **Requirements:** R3, R4, R5, R6, R7
- **Dependencies:** None
- **Files:** `src/Graph.tsx`
- **Approach:** Replace `useDecimalK` / binary `formatEquityAxis` with KTD2 tiers from `equityRange`. Optionally widen `margin.left` if full-dollar labels clip.
- **Execution note:** Smoke against tight (&lt;$100), mid ($100–$10k), and wide (≥$10k) ranges — mock domain if live data only covers one band.
- **Patterns to follow:** Existing y min/max and axis call sites in `src/Graph.tsx`.
- **Test scenarios:**
  - Covers AE2. Range `$40` → full dollars.
  - Covers AE3 / AE4. Range `$200` / `$4,100` → one-decimal `$k`.
  - Covers AE5. Range `$40k` → whole `$k`.
  - Regression: tooltip still `toFixed(2)`; styling unchanged.
- **Verification:** AE2–AE5; `npm run build` succeeds.

---

## Verification Contract

| Gate | Command / action | Applies to |
|---|---|---|
| Typecheck + production build | `npm run build` (repo root) | U1, U2 |
| Visual smoke | `npm run dev` — confirm x is month+year; check y on tight/mid/wide ranges | U1, U2 |

No `functions/` build or lint required.

---

## Definition of Done

- U1 and U2 complete when R1–R7 and AE1–AE5 hold, smoke passes, and `npm run build` passes.
- No unrelated refactors; no new dependencies.
