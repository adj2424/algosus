---
title: D3 equity chart axis labels follow peak-trough variance tiers
date: 2026-07-28
category: design-patterns
module: frontend (Graph component)
problem_type: design_pattern
component: frontend_stimulus
severity: low
applies_when:
  - "Formatting D3 axis tick labels on the portfolio equity chart in src/Graph.tsx"
  - "Y-axis precision should reflect visible peak-trough variance (yMax - yMin), not absolute tick magnitude"
  - "X-axis date labels are noisy at higher tick density and month+year is sufficient"
tags: [d3, graph, axis-labels, react, frontend, equity-chart, formatting]
---

# D3 equity chart axis labels follow peak-trough variance tiers

## Context

The portfolio equity chart in `src/Graph.tsx` uses D3 time and linear scales with custom tick formatters. After size-responsive tick density, x-axis labels still showed month plus day (`Jul 6`), which reads noisy across multi-month ranges. Y-axis labels used a binary rule (one-decimal `$k` when `equityRange < 1000`, else whole `$k`), which mis-handled tight swings (sub-$100 peak−trough variance needs full dollars) and mid-range variance ($1k–$10k still needs tenths like `$102.3k`).

Earlier attempts also branched on absolute tick magnitude (`Math.abs(n) < 1000`), which mixes per-tick size with scale precision.

## Guidance

**Choose y-axis precision from peak−trough variance, not from label magnitude.** Compute `equityRange = yMax - yMin` once per draw from the visible timeline (raw data min/max, not the padded scale domain). Every y tick in that render uses the same tier:

| Variance (`equityRange`) | Label style | Example ticks |
|---|---|---|
| &lt; $100 | Full dollars, `toLocaleString` | `$3,045`, `$3,080` |
| ≥ $100 and &lt; $10,000 | One-decimal `$k` | `$3.0k`, `$102.3k` |
| ≥ $10,000 | Whole `$k` | `$100k`, `$120k` |

**Format x-axis as month + year only.** Use `Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' })` so labels read `Jul 2026` with no day-of-month.

**Keep tooltip and axis rules separate.** Hover tooltips may keep full `toFixed(2)` and day-level dates; axis compaction is for tick readability.

**Do not branch on individual tick values for tier selection.** Avoid `Math.abs(n) < 1000` or per-tick `$k` vs full-dollar logic—the tier is fixed per draw from `equityRange`.

If full-dollar labels clip the left margin after a tight-range tier, widen `margin.left` only after visual smoke.

Current formatters in `src/Graph.tsx`:

```82:94:src/Graph.tsx
    // Y precision follows peak−trough variance (one tier per draw).
    const formatEquityAxis = (value: d3.NumberValue) => {
      const n = Number(value);
      if (equityRange < 100) return `$${Math.round(n).toLocaleString('en-US')}`;
      const k = n / 1000;
      if (equityRange < 10000) return `$${k.toFixed(1)}k`;
      return `$${Math.round(k)}k`;
    };

    const formatDateAxis = (value: Date | d3.NumberValue) => {
      const date = value instanceof Date ? value : new Date(value.valueOf());
      return new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(date);
    };
```

## Why This Matters

Wrong precision makes small portfolio moves look flat (whole `$k` on a $40 swing) or cluttered (full dollars on a wide band). Wrong x granularity adds noise when tick density already adapts to width. Tiering by **variance** keeps all ticks in a render consistent and matches how much the line actually moves. Separating axis compaction from tooltip precision preserves scanability without hiding exact values on hover.

## When to Apply

- D3 / SVG line charts where y values are currency and the meaningful “zoom level” is how much equity moves across the visible series—not absolute account size
- After tick-density work when x labels still feel noisy; month+year when multiple months span the chart
- Portfolio equity UIs where one global format rule fails across tight, mid, and wide historical ranges
- Not for tooltips, tables, or exports that should stay at full precision

## Examples

**Tight range (variance &lt; $100)** — peak $3,180, trough $3,140 → `equityRange = 40` → `$3,140`, `$3,160`.

**Small-to-medium ($100–$10k)** — peak $3,180, trough $2,980 → `equityRange = 200` → `$3.0k`, `$3.1k`.

**Mid portfolio, wider swing** — peak $104,200, trough $100,100 → `equityRange = 4,100` → `$100.1k`, `$104.2k` (tier is variance, not whether values exceed $100k).

**Wide range (≥ $10k)** — peak $140k, trough $100k → `equityRange = 40,000` → `$100k`, `$120k`, `$140k`.

**X-axis** — multi-month timeline → `Jul 2026`, `Aug 2026` (no day digits).

## Related

- [D3 equity chart hover tooltip sits too high above data points](../ui-bugs/graph-tooltip-vertical-offset.md) — same `src/Graph.tsx` chart; tooltip positioning and full-precision hover copy are separate from axis `tickFormat`
- Plan: `docs/plans/2026-07-28-005-feat-graph-axis-label-formats-plan.md`
