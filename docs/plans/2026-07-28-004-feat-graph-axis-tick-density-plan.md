---
title: Graph Axis Tick Density - Plan
type: feat
date: 2026-07-28
topic: graph-axis-tick-density
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
product_contract_source: ce-plan-bootstrap
execution: code
---

# Graph Axis Tick Density - Plan

## Goal Capsule

- **Objective:** Show more size-responsive axis ticks, and choose y-axis `$k` precision from the equity range (variance) on screen — tight ranges get tenths (`$3.1k`); wide ranges stay whole thousands (`$120k`).
- **Authority:** Extends the axis labeling/styling from `docs/plans/2026-07-28-003-feat-graph-axes-plan.md`. Keep date formats and classic clean styling.
- **Stop conditions:** Stop if denser ticks or longer y labels cause overlapping/clipping on common desktop or mobile widths.
- **Execution profile:** Small D3 tweak in `src/Graph.tsx`; visual smoke is primary proof (no frontend test suite).
- **Tail ownership:** `ce-work` or manual implementation after plan approval.

---

## Product Contract

### Summary

Increase x- and y-axis tick density from chart size, and format y-axis compact dollars with precision driven by the visible equity range (max − min), not by absolute magnitude: tight ranges use tenths of a thousand (e.g. `$3.1k`); wide ranges use whole thousands (e.g. `$120k`).

### Problem Frame

After the axis polish (real dates, `$k` labels, muted styling), tick counts are still fixed (~5 on x, 6 on y), so wide charts look sparse. Separately, `Math.round(n / 1000)` collapses nearby tick values whenever the equity band is narrow (e.g. `$3100`–`$3200` all become `$3k`), so the axis fails to show useful detail even though the chart itself has resolution. Absolute-magnitude rules (e.g. “always one decimal under `$10k`”) are the wrong lever — a `$120k`±`$200` zoom needs tenths too, while a `$3k`–`$50k` span does not.

### Requirements

**Tick density**

- R1. Both axes use more ticks than the current fixed caps when the chart is large enough to support them.
- R2. X-axis tick count scales with plot width; y-axis tick count scales with plot height.
- R3. Tick counts stay within sensible floors and ceilings so labels remain readable (no overlapping x labels; y labels do not crowd).

**Y-axis value detail**

- R4. Y-axis `$k` precision is chosen from the visible equity range (`yMax − yMin`, same domain the scale already uses), not from each tick’s absolute size.
- R5. When that range is small enough that whole-thousand rounding would make adjacent ticks collide or look identical, labels use one decimal place (e.g. `$3.0k`, `$3.1k`).
- R6. When the range is large enough that whole thousands remain distinct across ticks, labels use whole thousands (e.g. `$100k`, `$120k`).
- R7. Values below `$1000` continue to render without a `k` suffix when that form is clearer (e.g. `$850`).

**Regression guard**

- R8. Calendar dates on x, muted classic-clean styling, and no gridlines remain as today.
- R9. Line, hover tooltip content/positioning, and resize redraw behavior are unchanged aside from tick density and y tick label formatting.

### Scope Boundaries

**In scope**

- Dynamic `.ticks(n)` for bottom and left axes in `src/Graph.tsx`, driven by plot `w` / `h`.
- Adaptive precision in `formatEquityAxis` (or equivalent).

**Out of scope**

- Changing x-axis date formatters or tooltip dollar formatting (tooltip may keep full `toFixed(2)`).
- Gridlines, axis style variants, or tooltip positioning.
- Adaptive formats for multi-year / single-week date ranges.
- Backend or data changes.

### Success Criteria

- Wider charts show more x ticks; taller plots show more y ticks.
- A tight equity band (small variance) shows tenths (`$3.0k`, `$3.1k`); a wide band shows whole `$k` labels.
- Labels remain readable at desktop and ~375px widths; `npm run build` passes.

---

## Planning Contract

### Key Technical Decisions

- **KTD1. Derive tick counts from plot pixels, not a fixed constant.** Replace `Math.min(5, timeline.length)` and `ticks(6)` with helpers: `xTickCount = clamp(floor(w / pxPerXTick), xMin, xMax)` and `yTickCount = clamp(floor(h / pxPerYTick), yMin, yMax)`, then still `Math.min(xTickCount, timeline.length)` for x. Default targets: ~70–90px per x tick, ~36–48px per y tick; floors ~3–4 and ceilings ~10–12 (x) / ~8–10 (y). Tune during visual smoke.

- **KTD2. Keep D3's interval choice.** Pass only the count into `.ticks(n)`; let scales pick nice intervals.

- **KTD3. Adaptive `$k` precision from equity range (variance), not absolute tick value.** (session-settled: user-directed — chosen over magnitude thresholds like “decimal if under `$10k`”: a narrow band at any level needs tenths; a wide band does not.) Before building the axis, compute `range = yMax - yMin` (the raw data span; padding on the scale domain does not change the decision). If `range < 1000` (less than one full `$k` of spread), format `$k` ticks with one decimal (`toFixed(1)`). Otherwise format with `Math.round(n / 1000)`. Apply the same precision mode to every y tick for that render so the axis is consistent. Values `|n| < 1000` may still omit `k` when that reads clearer.

- **KTD4. Keep `styleAxis` and margins.** Bump `margin.left` only if `$9.5k`-style labels clip after smoke.

### Assumptions

- "Graph size" means SVG host content size already in `size` / plot `w` and `h`.
- Both axes scale with size.
- Default range threshold of `$1000` (one `$k` of variance) matches the user’s 3k-detail vs 120k-wide examples; tune during smoke if ticks still collide or look overly precise.

---

## Implementation Units

### U1. Size-responsive axis tick counts

- **Goal:** Compute x/y tick counts from plot dimensions and apply them to the axes.
- **Requirements:** R1, R2, R3, R8, R9
- **Dependencies:** None
- **Files:** `src/Graph.tsx`
- **Approach:** After `w`/`h` are known, compute clamped tick counts from px-per-tick constants. Wire `axisBottom` / `axisLeft` `.ticks(...)`. Leave styling helpers as-is.
- **Execution note:** Prefer `npm run dev` resize smoke — wide vs narrow tick density; no label overlap.
- **Patterns to follow:** Existing axis setup in `src/Graph.tsx`.
- **Test scenarios:**
  - Happy path: desktop-wide chart shows more than 5 x ticks when timeline length allows.
  - Happy path: taller plot shows more than 6 y ticks when height allows.
  - Edge case: ~375px width — fewer ticks, no overlapping x labels.
  - Edge case: short timeline (2–3 points) — x ticks ≤ `timeline.length`.
- **Verification:** Resize smoke passes; `npm run build` succeeds.

### U2. Variance-based y-axis `$k` precision

- **Goal:** Pick one-decimal vs whole `$k` labels from the visible equity range so tight bands show cost detail.
- **Requirements:** R4, R5, R6, R7, R8, R9
- **Dependencies:** None (can land with or after U1)
- **Files:** `src/Graph.tsx`
- **Approach:** After `yMin`/`yMax` are known, set a render-local precision mode from `yMax - yMin` per KTD3. Pass that mode into `formatEquityAxis` (closure or helper arg) so every tick for this draw uses the same rule.
- **Execution note:** Visual check with a tight equity band (small variance) and a wide band (large variance); mock or filter timeline if live data only covers one case.
- **Patterns to follow:** Existing `formatEquityAxis` and y-domain padding in `src/Graph.tsx`.
- **Test scenarios:**
  - Happy path: range ≈ `$200` around `$3k` → ticks like `$3.0k`, `$3.1k` (one decimal).
  - Happy path: range ≈ `$40k` around `$120k` → ticks like `$100k`, `$120k` (whole thousands).
  - Edge case: wide absolute level but tiny range (e.g. `$120000`–`$120400`) → still one decimal because variance is small.
  - Edge case: `|n| < 1000` → no `k` when that form is clearer.
  - Regression: tooltip still shows full `toFixed(2)` dollars; x date labels unchanged.
- **Verification:** Y labels match R4–R7 on tight and wide ranges; `npm run build` succeeds.

---

## Verification Contract

| Gate | Command / action | Applies to |
|---|---|---|
| Typecheck + production build | `npm run build` (repo root) | U1, U2 |
| Visual smoke | `npm run dev` — resize for tick density; inspect y labels on tight-range and wide-range equity | U1, U2 |

No `functions/` build or lint required — backend untouched.

---

## Definition of Done

- U1 and U2 complete when R1–R9 are met, resize/format smoke passes, and `npm run build` passes.
- No unrelated refactors in `Graph.tsx`.
- No new dependencies.
