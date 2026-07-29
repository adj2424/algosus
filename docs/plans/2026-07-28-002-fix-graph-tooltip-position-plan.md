---
title: Graph Tooltip Position - Plan
type: fix
date: 2026-07-28
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
product_contract_source: ce-plan-bootstrap
execution: code
---

# Graph Tooltip Position - Plan

## Goal Capsule

- **Objective:** Lower the equity chart hover tooltip so it sits slightly closer to the data point instead of floating too high above it.
- **Authority:** This plan overrides ad-hoc tooltip tweaks. Repo safety rules in `.cursor/rules/safety.mdc` still apply (no trading-logic changes).
- **Stop conditions:** Stop if lowering the tooltip causes overlap with the chart header or clips off the top of the chart container on common viewport sizes.
- **Execution profile:** Single focused UI fix; manual visual verification is the primary proof (no frontend test suite in repo).
- **Tail ownership:** `ce-work` or manual implementation after plan approval.

---

## Product Contract

### Summary

Reduce the graph tooltip's vertical offset on hover so it appears slightly lower and closer to the hovered equity point.

### Problem Frame

The portfolio dashboard's D3 line chart shows a tooltip on hover with equity value and date. Users report the tooltip sits too high above the cursor/point, making it feel disconnected from the data. Positioning is controlled by a hardcoded pixel offset in `src/Graph.tsx` plus a CSS transform in `src/Graph.css`.

### Requirements

- R1. On hover over a chart data point, the tooltip appears slightly lower than it does today while remaining above the point (not overlapping the line).
- R2. Tooltip stays horizontally centered on the hovered point.
- R3. Tooltip does not clip outside the chart card on desktop and mobile widths.
- R4. No change to tooltip content, styling theme, or chart data behavior.

### Scope Boundaries

**In scope**

- Vertical positioning of `.graph-tooltip` in the equity graph.

**Out of scope**

- Tooltip copy, colors, font size, or animation.
- Chart scales, margins, resize behavior, or trading data.
- Adding automated tests or CI (per project scope rules).

### Success Criteria

- Hovering chart points shows the tooltip visibly closer to the point than before.
- Tooltip remains readable and does not overlap the graph header.
- `npm run build` passes.

---

## Planning Contract

### Key Technical Decisions

- **KTD1. Adjust the JS vertical offset constant, not the CSS anchor transform.** The tooltip uses `top` in `Graph.tsx` (`margin.top + yScale(equity) - 32`) and `transform: translate(-50%, -100%)` in `Graph.css`. Lower the tooltip by reducing the subtracted offset (e.g. `32` → `24`, ~8px lower). Keep `translate(-50%, -100%)` so the tooltip stays above the point; only the gap changes. Rationale: the magic number lives next to the mouseover handler; one constant is easier to tune than splitting offset across JS and CSS.

- **KTD2. Extract a named constant for the offset.** Replace the inline `32` with something like `TOOLTIP_OFFSET_PX` at the top of the effect or file so future visual tweaks do not require hunting through the handler. Rationale: matches the chart's existing margin object pattern and documents intent.

### Assumptions

- "Slightly lower" means roughly 6–10px; `8px` is the default tuning target.
- Current horizontal centering and opacity behavior are correct and unchanged.

---

## Implementation Units

### U1. Lower graph tooltip vertical offset

- **Goal:** Move the hover tooltip down slightly while preserving centered-above-point placement.
- **Requirements:** R1, R2, R3, R4
- **Dependencies:** None
- **Files:** `src/Graph.tsx`, `src/Graph.css` (read-only unless CSS tuning is needed after visual check)
- **Approach:** In `src/Graph.tsx`, introduce `TOOLTIP_OFFSET_PX` (default `24`, down from `32`) and use it in the mouseover `top` style: `` `${margin.top + yScale(d.equity) - TOOLTIP_OFFSET_PX}px` ``. Leave `src/Graph.css` `.graph-tooltip` transform unchanged unless manual verification shows the tooltip still sits too high or too low; if so, prefer a small CSS `calc()` adjustment only after the JS constant change.
- **Execution note:** Prefer install/runtime smoke verification over unit coverage — run `npm run dev`, hover several points (first, middle, last, peak, trough), and confirm the tooltip sits closer without clipping.
- **Patterns to follow:** Existing D3 tooltip setup in `src/Graph.tsx` (container-scoped `.graph-tooltip`, hidden hit-target circles, margin-aware positioning).
- **Test scenarios:**
  - Happy path: hover a mid-chart point — tooltip appears above the point, centered horizontally, ~8px lower than before.
  - Edge case: hover the highest point on the line — tooltip does not clip above the chart card or overlap the graph header.
  - Edge case: hover the leftmost and rightmost points — tooltip stays within the card horizontally.
  - Regression: mouseout hides tooltip (`opacity: 0`); content format unchanged (`$equity · Mon DD, YYYY`).
- **Verification:** Tooltip position looks correct at desktop and mobile widths; `npm run build` succeeds.

---

## Verification Contract

| Gate | Command / action | Applies to |
|---|---|---|
| Typecheck + production build | `npm run build` (repo root) | U1 |
| Visual smoke | `npm run dev`, hover chart points on desktop and a narrow viewport (~375px) | U1 |

No `functions/` build or lint required — backend untouched.

---

## Definition of Done

- U1 complete when R1–R4 are met, manual hover checks pass on desktop and mobile widths, and `npm run build` passes.
- No unrelated refactors in `Graph.tsx` or `Graph.css`.
- No new dependencies.
