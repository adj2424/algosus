---
title: Graph Axes - Plan
type: feat
date: 2026-07-28
topic: graph-axes
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
product_contract_source: ce-brainstorm
execution: code
---

# Graph Axes - Plan

## Goal Capsule

- **Objective:** Make the equity chart axes readable and visually polished — real dates on the x-axis and a classic clean axis treatment on both axes.
- **Product authority:** This plan governs axis labeling and styling for the portfolio line chart. Tooltip behavior is covered separately in `docs/plans/2026-07-28-002-fix-graph-tooltip-position-plan.md`.
- **Stop conditions:** Stop if date-based x scaling breaks line/point alignment or tooltip horizontal positioning (R8 regression).
- **Execution profile:** Small D3 UI change in `src/Graph.tsx`; manual visual verification is the primary proof (no frontend test suite in repo).
- **Tail ownership:** `ce-work` or manual implementation after plan approval.

---

## Product Contract

**Product Contract preservation:** unchanged.

### Summary

Replace day-count x-axis labels with real calendar dates and restyle both axes in a classic clean look: thin muted axis lines and tick marks, no gridlines, with compact dollar labels on the y-axis (`$102k`).

### Problem Frame

The portfolio dashboard's D3 equity chart currently labels the x-axis with day offsets from the first data point (0, 5, 10…) rather than recognizable dates. The default D3 axis styling also looks unpolished against the rest of the dashboard. Together this makes the chart harder to read and less credible as a portfolio view.

### Key Decisions

- **Real calendar dates on the x-axis** (session-settled: user-directed — chosen over day-count offsets: dates match how users think about trading history and align with tooltip date formatting).
- **Classic clean axis styling** (session-settled: user-directed — chosen over minimal (gridlines only) and gridline-forward variants: thin muted axis lines and ticks, no gridlines).
- **Compact y-axis labels** (session-settled: user-directed — chosen over full dollar values: `$102k` keeps labels short at typical equity ranges).

### Requirements

**X-axis**

- R1. The x-axis displays real calendar dates (e.g. `Jul 6`, `Jul 13`) derived from timeline entry dates, not day counts from the first point.
- R2. X-axis tick density stays readable across the chart's responsive width — roughly 4–6 ticks for typical timeline lengths, without overlapping labels.

**Y-axis**

- R3. Y-axis labels use compact dollar format with a `k` suffix for thousands (e.g. `$100k`, `$102k`, `$105k`).
- R4. Y-axis tick values remain meaningful for the equity range shown (no redundant or awkward tick values).

**Axis styling**

- R5. Both axes use thin muted axis lines and small tick marks in a gray tone consistent with the dashboard's muted text color.
- R6. No gridlines on either axis.
- R7. Axis label typography matches the dashboard's system font and muted text color.

**Regression guard**

- R8. The equity line, hover tooltip content, and chart resize behavior are unchanged.

### Acceptance Examples

- AE1. **Covers R1, R3.**
  - **Given:** A timeline spanning roughly three weeks of trading data.
  - **When:** The chart renders.
  - **Then:** The x-axis shows month-day labels (not `0`, `5`, `10`) and the y-axis shows values like `$100k` and `$105k`.

- AE2. **Covers R5, R6.**
  - **Given:** A rendered chart on desktop width.
  - **When:** The user inspects the axes.
  - **Then:** Thin muted axis lines and tick marks are visible; no horizontal or vertical gridlines appear behind the line.

### Scope Boundaries

**Deferred for later**

- Adaptive tick formatting for very short timelines (single week) or very long timelines (multi-year).
- Axis label rotation or truncation strategies for narrow mobile viewports.

**Out of scope**

- Tooltip positioning, content, or styling.
- Chart header controls (date range filters).
- Gridline-based axis variants (minimal or gridline-forward styles).
- Full-value y-axis labels (`$102,000`).
- Trading logic, data fetching, or backend changes.

### Success Criteria

- A user can read approximate dates and equity values directly from the axes without hovering.
- Axis styling looks intentional and consistent with the dashboard, not like raw D3 defaults.
- `npm run build` passes.

---

## Planning Contract

### Key Technical Decisions

- **KTD1. Replace the x linear day-offset scale with `d3.scaleTime`.** (session-settled: user-directed — chosen over keeping `scaleLinear` with a custom tick formatter: a time scale maps directly to timeline dates and keeps line, point, and tooltip x-positioning consistent.) Domain: `[initialDate, currentDate]` from first and last timeline entries. All x accessors (`line`, circles, tooltip `left`) use `xScale(new Date(d.date))` instead of `xScale(getDateDifference(...))`. Remove `getDateDifference` if no longer referenced.

- **KTD2. Format x ticks with the same month-day style as the tooltip.** Use `d3.timeFormat('%b %-d')` or `Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' })` for labels like `Jul 6`. Cap ticks at roughly 5 via `.ticks(Math.min(5, timeline.length))` on the bottom axis.

- **KTD3. Format y ticks as compact thousands.** (session-settled: user-directed — chosen over full dollar values.) Use a small formatter: values ≥ 1000 render as `$${Math.round(value / 1000)}k` (e.g. `$102k`); values below 1000 render as `$${value}` without a `k` suffix. Apply via `axisLeft(yScale).ticks(6).tickFormat(formatEquityAxis)`.

- **KTD4. Style axes inline from CSS custom properties, matching existing color reads.** After calling each axis generator, select `.domain`, `.tick line`, and `.tick text` and set stroke/fill from `getComputedStyle(document.documentElement).getPropertyValue('--color-ink-muted')` (already used for `--color-positive` / `--color-negative` in the same effect). Use ~11px tick text. Do not add gridlines — the current chart has none; keep it that way.

- **KTD5. Leave chart margins unchanged unless visual smoke shows y-label clipping.** Default `margin.left: 60` should fit `$105k`-style labels; bump left margin only if manual verification shows clipping.

### Assumptions

- Timeline `date` fields parse reliably with `new Date(d.date)` (same as tooltip today).
- Equity values are stored in dollars (tooltip uses `$${Number(d.equity).toFixed(2)}`), so the `k` formatter divides by 1000.
- No new npm dependencies; D3 axis/time APIs already ship with the project.

---

## Implementation Units

### U1. Time-based x scale and axis tick formatters

- **Goal:** Show real calendar dates on the x-axis and compact `$k` labels on the y-axis.
- **Requirements:** R1, R2, R3, R4, R8
- **Dependencies:** None
- **Files:** `src/Graph.tsx`
- **Approach:** Replace `xScale = d3.scaleLinear().domain([0, rangeDate])` with `d3.scaleTime().domain([initialDate, currentDate]).range([0, w])`. Update `line`, circle `cx`, and tooltip `left` to use `xScale(new Date(d.date))`. Build `xAxis = d3.axisBottom(xScale).ticks(Math.min(5, timeline.length)).tickFormat(...)` and `yAxis = d3.axisLeft(yScale).ticks(6).tickFormat(formatEquityAxis)`. Replace the two `.call(d3.axisBottom/Left(...))` lines with `.call(xAxis)` / `.call(yAxis)`.
- **Execution note:** Prefer `npm run dev` visual smoke over unit coverage — confirm line still tracks points and tooltip horizontal position after the scale change.
- **Patterns to follow:** Existing date parsing in the tooltip mouseover handler (`new Date(d.date)`, `Intl.DateTimeFormat`); existing y-scale padding logic.
- **Test scenarios:**
  - Covers AE1. Render with multi-week timeline — x-axis shows `Jul 6`-style labels, not `0`, `5`, `10`; y-axis shows `$100k`-style labels.
  - Happy path: line connects all points smoothly; hidden hover circles still align with the line.
  - Edge case: two-point timeline — x-axis shows two date labels without error.
  - Regression: tooltip content unchanged; resize still redraws chart correctly.
- **Verification:** AE1 passes on desktop; `npm run build` succeeds.

### U2. Classic clean axis styling

- **Goal:** Apply muted axis lines, tick marks, and label typography with no gridlines.
- **Requirements:** R5, R6, R7
- **Dependencies:** U1
- **Files:** `src/Graph.tsx` (optional: `src/Graph.css` only if a shared class is cleaner than inline attrs)
- **Approach:** After each `.call(xAxis)` / `.call(yAxis)`, chain selections to style `.domain` (stroke, no fill), `.tick line` (stroke), and `.tick text` (fill, font-size). Read `--color-ink-muted` from computed root styles. Do not call `d3.axisLeft(...).tickSizeInner(-w)` or any gridline pattern.
- **Execution note:** Visual comparison against the brainstorm's "classic clean" direction — thin gray lines and ticks, no background grid.
- **Patterns to follow:** `getComputedStyle(document.documentElement)` color reads in the same `useEffect`; `--color-ink-muted` from `src/index.css`.
- **Test scenarios:**
  - Covers AE2. Desktop render — muted axis domain and tick lines visible; no horizontal/vertical grid behind the equity line.
  - Regression: equity line color (positive/negative) unchanged; no new SVG elements beyond axis styling attrs.
- **Verification:** AE2 passes; axes visually match dashboard muted text tone.

---

## Verification Contract

| Gate | Command / action | Applies to |
|---|---|---|
| Typecheck + production build | `npm run build` (repo root) | U1, U2 |
| Visual smoke | `npm run dev`, inspect axes at desktop and ~375px width | U1, U2 |

No `functions/` build or lint required — backend untouched.

---

## Definition of Done

- U1 and U2 complete when R1–R8 are met, manual axis checks pass on desktop and mobile widths, and `npm run build` passes.
- No unrelated refactors in `Graph.tsx` beyond removing dead `getDateDifference` if unused.
- No new dependencies.
- Tooltip plan (`2026-07-28-002`) behavior remains intact.
