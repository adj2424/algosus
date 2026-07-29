---
title: D3 equity chart hover tooltip sits too high above data points
date: 2026-07-28
category: ui-bugs
module: frontend (Graph component)
problem_type: ui_bug
component: frontend_stimulus
symptoms:
  - "Hover tooltip on the equity chart appears noticeably above the data point instead of snugly above it"
  - "Vertical gap between tooltip and hovered dot looks too large on the D3 line chart"
  - "Tooltip position combines JS top offset with CSS translate(-50%, -100%), amplifying the upward shift"
root_cause: logic_error
resolution_type: code_fix
severity: low
tags: [d3, graph, tooltip, react, frontend, ui-positioning]
---

# D3 equity chart hover tooltip sits too high above data points

## Problem

On the portfolio dashboard equity line chart (`src/Graph.tsx`), the hover tooltip floated too far above the data point. Vertical placement combined a hardcoded JavaScript offset with a CSS transform, leaving a visible gap between the tooltip and the hovered point.

## Symptoms

- Hovering any timeline point showed the tooltip noticeably high above the equity dot/line.
- The tooltip felt disconnected from the value being read (equity amount and date).
- Horizontal centering and tooltip content were fine; only vertical gap was wrong.
- Reproduced on desktop and narrow viewports; no console errors.

## What Didn't Work

- **Tweaking only the CSS `transform` on `.graph-tooltip`.** The tooltip anchor is set in the D3 `mouseover` handler via inline `top`/`left` styles in `src/Graph.tsx`, while `src/Graph.css` applies `transform: translate(-50%, -100%)` to center horizontally and place the box above the anchor. Changing the transform alone would alter the anchor semantics globally without a single tunable gap next to the data-point math.
- **Leaving the magic number `32` inline.** The offset was buried in the handler, making small visual tuning harder to reason about when reading margin-aware positioning.

## Solution

Introduce named offset constants beside the tooltip setup and reduce the upward gap from **32px to 24px** (8px closer to the point). Keep `.graph-tooltip` CSS unchanged.

**Before** (`src/Graph.tsx` mouseover handler):

```typescript
tooltip
  .text(`$${Number(d.equity).toFixed(2)} · ${month} ${cur.getDate()}, ${cur.getFullYear()}`)
  .style('left', `${margin.left + xScale(getDateDifference(initialDate, new Date(d.date)))}px`)
  .style('top', `${margin.top + yScale(d.equity) - 32}px`)
  .style('opacity', 1);
```

**After** (`src/Graph.tsx`):

```typescript
const TOOLTIP_OFFSET_PX = -24;
const TOOLTIP_OFFSET_PX_LEFT = 12;
// ...
tooltip
  .text(`$${Number(d.equity).toFixed(2)} · ${month} ${cur.getDate()}, ${cur.getFullYear()}`)
  .style(
    'left',
    `${margin.left + xScale(getDateDifference(initialDate, new Date(d.date))) + TOOLTIP_OFFSET_PX_LEFT}px`
  )
  .style('top', `${margin.top + yScale(d.equity) - TOOLTIP_OFFSET_PX}px`)
  .style('opacity', 1);
```

The vertical gap is controlled by the term subtracted from `margin.top + yScale(d.equity)`. The previous inline `- 32` pulled the anchor 32px above the data point. The fix targets **24px** instead: `margin.top + yScale(d.equity) - 24`. In the current tree, `TOOLTIP_OFFSET_PX` is `-24` and the handler uses `- TOOLTIP_OFFSET_PX`, which algebraically equals `+ 24`. Prefer a positive `TOOLTIP_OFFSET_PX = 24` with `- TOOLTIP_OFFSET_PX` for readability.

**Unchanged** (`src/Graph.css`):

```css
.graph-tooltip {
	position: absolute;
	pointer-events: none;
	transform: translate(-50%, -100%);
	/* ... */
}
```

**Verification:** `npm run build` (repo root) passes after the change.

## Why This Works

Tooltip position is the sum of two layers:

1. **JavaScript (`src/Graph.tsx`):** `top` and `left` are set from chart margins plus D3 scales at the hovered point.
2. **CSS (`src/Graph.css`):** `translate(-50%, -100%)` shifts the tooltip so its bottom edge sits on that anchor and it is centered on `left`.

Subtracting **32** from the point Y pulled the anchor 32px above the data point; combined with `-100%` vertical transform, that produced an extra-large gap. Reducing that offset to **24px** moves the anchor 8px down while keeping the tooltip above the point via `-100%`.

## Prevention

- **Keep tooltip gap in one place.** Tune vertical distance via a named constant next to the D3 tooltip setup in `src/Graph.tsx`, not split across JS and CSS, unless you intentionally change anchor semantics.
- **Account for CSS transform when debugging.** If a tooltip looks too high, check both the inline `top` math and `.graph-tooltip { transform: translate(-50%, -100%); }` — the visual position is the combination.
- **Use positive constants for readability.** Prefer `const TOOLTIP_OFFSET_PX = 24` with `top: \`… - ${TOOLTIP_OFFSET_PX}px\`` so the sign matches “pixels above the anchor” without a double negative.
- **Visual smoke after offset changes.** Run `npm run dev`, hover first/middle/last points plus peaks and troughs, and confirm the tooltip does not clip the graph header on desktop and ~375px width.

## Related Issues

- Plan: `docs/plans/2026-07-28-002-fix-graph-tooltip-position-plan.md`
- Graph refactor context: `docs/plans/2026-07-27-004-feat-modern-mobile-ui-plan.md`
