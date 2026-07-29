---
title: Graph X-Axis Date Span Labels - Plan
type: feat
date: 2026-07-29
topic: graph-x-axis-date-span
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
product_contract_source: ce-plan-bootstrap
execution: code
---

# Graph X-Axis Date Span Labels - Plan

## Goal Capsule

- **Objective:** Make short visible timelines show day-level x-axis labels while longer spans keep month+year.
- **Authority:** Extends axis work in `docs/plans/2026-07-28-005-feat-graph-axis-label-formats-plan.md`. Keep size-responsive tick counts, y peak−trough tiers, classic-clean styling, and tooltip day-level copy.
- **Stop conditions:** Stop if day labels collide or clip at dense short-range tick counts on common desktop or ~375px widths.
- **Execution profile:** Small D3 formatter change in `src/Graph.tsx`; visual smoke is primary proof (no frontend test suite).
- **Tail ownership:** `ce-work` or manual implementation after plan approval.

---

## Product Contract

**Product Contract preservation:** N/A (bootstrap from session brainstorm; no requirements-only artifact was written).

### Summary

Choose x-axis date label specificity from the visible timeline start→end span: about three months or less → day labels (`Jul 6`, with year when the span crosses a year); longer → keep month+year (`Jul 2026`).

### Problem Frame

After plan 005 locked x labels to month+year, short filtered ranges (1D / 1W / 1M and any other ≤~3-month window) read as vague (`Jul 2026` repeated). Hover tooltips already show day-level dates; the axis should match that specificity when the visible span is short. Longer histories stay month+year so multi-month charts do not get noisy day digits.

### Key Decisions

- **Span-based switching, not GraphHeader button-based** (session-settled: user-directed — chosen over tying day labels only to 1D/1W/1M presets: any visible ≤~3-month window should get day labels).
- **Format switch only** (session-settled: user-directed — chosen over denser day ticks or collision-triggered upgrades: smallest change that fixes vague short-range labels).
- **Longer ranges stay month+year** (session-settled: user-directed — chosen over also coarsening long spans to year-only).
- **Day format `Jul 6`; include year when the span crosses a year** (session-settled: user-directed — chosen over always omitting year across year boundaries).

### Requirements

**X-axis**

- R1. When the visible start→end span is ≤ ~90 days (~3 months), every x tick uses day-level labels in the form `Jul 6`.
- R2. When that short span crosses a calendar year boundary, day-level labels include the four-digit year (e.g. `Jul 6, 2026`).
- R3. When the visible span is greater than ~90 days, x ticks keep abbreviated month + four-digit year (e.g. `Jul 2026`), with no day-of-month.
- R4. Format tier is chosen once per draw from the visible timeline domain; every x tick in that render uses the same tier.
- R5. Span is measured from the first and last points of the visible `timeline` series (same domain as the time scale), not from which range button was clicked.

**Regression**

- R6. Size-responsive x/y tick counts, y peak−trough `$k` tiers, muted classic-clean styling, equity line, and tooltip formatting stay as they are.

### Acceptance Examples

- AE1. **Covers R1, R5.** Visible timeline ≈ 1 week (e.g. 1W) → x ticks like `Jul 6`, `Jul 8` (day present; no year unless R2 applies).
- AE2. **Covers R1.** Visible timeline ≈ 1 month (e.g. 1M) → still day-level labels.
- AE3. **Covers R3.** Visible timeline ≈ 1 year or ALL spanning more than ~90 days → x ticks like `Jul 2026`, `Oct 2026` (no day digits).
- AE4. **Covers R2.** Short span that crosses New Year (e.g. Dec 20 → Jan 10) → day labels include year.
- AE5. **Covers R6.** Tooltip still shows full `toFixed(2)` equity and day-level date text; y-axis tiers unchanged.

### Scope Boundaries

**In scope**

- Span-aware `formatDateAxis` (or equivalent) in `src/Graph.tsx`.
- Refresh `docs/solutions/design-patterns/graph-axis-label-variance-tiers.md` so x guidance matches the new span tiers.
- Optional CONCEPTS.md entry for visible date span if the term is used canonically.

**Out of scope**

- Changing `PX_PER_X_TICK` / tick-count clamps.
- Coarsening long histories to year-only.
- GraphHeader button wiring for format selection.
- Tooltip copy changes, gridlines, axis style variants.
- Backend or data model changes.

### Success Criteria

- Short ranges show readable day labels; long ranges stay month+year.
- Year appears on day labels only when the short span crosses a year.
- Labels remain readable at desktop and ~375px; `npm run build` passes.

---

## Planning Contract

### Key Technical Decisions

- **KTD1. Compute date span once per draw, mirror y-axis `equityRange`.** From `initialDate` / `currentDate` already used for `xScale.domain`, derive span in days (e.g. millisecond delta / ms-per-day). Threshold: `spanDays <= 90` → day tier; else month+year. (session-settled product cutoff ≈3 months — planning default ~90 days.)

- **KTD2. Branch `formatDateAxis` on span tier + year-crossing flag.** Day tier without year cross: `Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' })`. Day tier with `initialDate.getFullYear() !== currentDate.getFullYear()`: include `year: 'numeric'` (same shape as tooltip, e.g. `Jul 6, 2026`). Long tier: keep `{ month: 'short', year: 'numeric' }`.

- **KTD3. Do not couple format to GraphHeader range IDs.** Filtered `timeline` already reshapes the domain; span measurement is sufficient (inherits KTD from session-settled span-based decision).

### Assumptions

- ~90 calendar days is an acceptable encoding of “3 months or less”; exact calendar-month arithmetic is unnecessary for this chart.
- Year-included day labels use `Intl` month+day+year (e.g. `Jul 6, 2026`), matching tooltip readability.
- Day labels at existing short-range tick density remain readable without raising tick count; if smoke shows collisions, stop per Goal Capsule rather than silently densifying.

### Alternatives Considered

- **Collision-triggered day detail** — upgrade only when month+year ticks duplicate. Rejected in brainstorm for unpredictability vs a fixed span cutoff.
- **Span threshold + denser day ticks** — more readable short ranges but reopens plan 004 constants; deferred.

---

## Implementation Units

### U1. Span-tiered x-axis date formatter

- **Goal:** Switch x tick labels between day and month+year from visible date span.
- **Requirements:** R1–R6; KTDs 1–3
- **Dependencies:** None
- **Files:** `src/Graph.tsx`
- **Approach:** Inside the existing D3 draw effect, after `initialDate` / `currentDate`, compute `spanDays` and `crossesYear`. Choose Intl options once; use that formatter for `axisBottom(...).tickFormat(...)`. Leave `xTickCount`, y formatter, styling, and tooltip untouched.
- **Execution note:** Prefer visual smoke over unit tests (no frontend suite). Exercise 1W, 1M, 1YR/ALL, and a Dec→Jan short window (mock timeline if needed).
- **Patterns to follow:** One-tier-per-draw pattern of `equityRange` / `formatEquityAxis` in `src/Graph.tsx`; day format from `docs/plans/2026-07-28-003-feat-graph-axes-plan.md` (`month: 'short', day: 'numeric'`).
- **Test scenarios:**
  - Covers AE1. ~7-day timeline → day labels without year (same calendar year).
  - Covers AE2. ~30-day timeline → day labels.
  - Covers AE3. Span > 90 days → month+year only.
  - Covers AE4. Short cross-year timeline → day labels with year.
  - Covers AE5. Tooltip and y-axis formatting unchanged after the change.
  - Edge: single-point / GraphHeader 1D synthetic two-point series → day tier, no crash.
- **Verification:** AE1–AE5 hold under `npm run dev` smoke; `npm run build` succeeds.

### U2. Refresh axis label solution guidance

- **Goal:** Align institutional x-axis guidance with span tiers so future agents do not re-apply “month+year only.”
- **Requirements:** Supports durable R1–R3 after U1 ships
- **Dependencies:** U1
- **Files:** `docs/solutions/design-patterns/graph-axis-label-variance-tiers.md`; optionally `CONCEPTS.md`
- **Approach:** Replace “Format x-axis as month + year only” with span-tiered rules (≤90 days → day; year if crosses year; else month+year). Keep y peak−trough and tooltip-separation guidance. Add a short CONCEPTS entry for visible date span if useful as a peer to Peak−trough variance.
- **Execution note:** Doc-only; no build gate beyond ensuring links/paths stay valid.
- **Patterns to follow:** Existing solution doc structure and CONCEPTS glossary style.
- **Test expectation:** none — documentation update only.
- **Verification:** Solution doc examples match AE1–AE4; no remaining absolute “never show day” claim for the axis.

---

## Verification Contract

| Gate | Command / action | Applies to |
|---|---|---|
| Typecheck + production build | `npm run build` (repo root) | U1 |
| Visual smoke | `npm run dev` — 1W/1M day labels; 1YR/ALL month+year; cross-year short span includes year; tooltip/y unchanged | U1 |
| Doc consistency | Solution (and optional CONCEPTS) match shipped behavior | U2 |

No `functions/` build or lint required.

---

## Definition of Done

- U1 complete when R1–R6 and AE1–AE5 hold, smoke passes, and `npm run build` passes.
- U2 complete when the solution doc (and optional CONCEPTS entry) describe span-tiered x labels.
- No unrelated refactors; no new dependencies.
