---
title: D3 equity chart axis labels follow peak-trough variance tiers
date: 2026-07-28
last_updated: 2026-07-29
category: design-patterns
module: frontend (Graph component)
problem_type: design_pattern
component: frontend_stimulus
severity: low
applies_when:
  - "Formatting D3 axis tick labels on the portfolio equity chart in src/Graph.tsx"
  - "Y-axis precision should reflect visible peak-trough variance (yMax - yMin), not absolute tick magnitude"
  - "X-axis date labels should match visible timeline span (day vs month+year)"
tags: [d3, graph, axis-labels, react, frontend, equity-chart, formatting, visible-date-span]
---

# D3 equity chart axis labels follow peak-trough variance tiers

## Context

The portfolio equity chart in `src/Graph.tsx` uses D3 time and linear scales with custom tick formatters. Y-axis labels once used a binary rule (one-decimal `$k` when `equityRange < 1000`, else whole `$k`), which mis-handled tight swings and mid-range variance; that was fixed with peak−trough variance tiers (Jul 2026).

X-axis labels went through a similar arc. Plan 005 locked every x tick to month+year (`Jul 2026`) to reduce noise on multi-month charts. That fixed long spans but made short filtered ranges (1W / 1M) vague — every tick repeated the same month. Tooltips already showed day-level dates; the axis did not.

The fix mirrors the y-axis pattern: choose one format tier per draw from the **visible** series window, not from which range button was clicked or from individual tick values.

Earlier attempts also branched on absolute tick magnitude (`Math.abs(n) < 1000`), which mixes per-tick size with scale precision.

## Guidance

**Choose y-axis precision from peak−trough variance, not from label magnitude.** Compute `equityRange = yMax - yMin` once per draw from the visible timeline (raw data min/max, not the padded scale domain). Every y tick in that render uses the same tier:

| Variance (`equityRange`) | Label style | Example ticks |
|---|---|---|
| &lt; $100 | Full dollars, `toLocaleString` | `$3,045`, `$3,080` |
| ≥ $100 and &lt; $10,000 | One-decimal `$k` | `$3.0k`, `$102.3k` |
| ≥ $10,000 | Whole `$k` | `$100k`, `$120k` |

**Choose x-axis date specificity from visible date span, not from range buttons.** Use the same dates as `xScale.domain` — `timeline[0].date` through `timeline[last].date`. Compute span once per draw; every x tick shares one `Intl.DateTimeFormat`:

| Visible span | Label style | Example ticks |
|---|---|---|
| ≤ ~90 days | Day (`month` + `day`) | `Jul 6`, `Jul 8` |
| ≤ ~90 days and crosses a calendar year | Day + year | `Dec 28, 2025`, `Jan 5, 2026` |
| &gt; ~90 days | Month + year (no day) | `Jul 2026`, `Oct 2026` |

Use `Math.abs(currentDate - initialDate) / MS_PER_DAY` for span; `<= 90` is the product cutoff for “about three months.” Year on day labels only when `initialDate.getFullYear() !== currentDate.getFullYear()`.

**Keep tooltip and axis rules separate.** Hover tooltips may keep full `toFixed(2)` and day-level dates; axis compaction is for tick readability.

**Do not branch on individual tick values for tier selection.** The tier is fixed per draw from `equityRange` (y) or visible date span (x). Do not tie x format to GraphHeader button IDs — filtered `timeline` already reshapes the domain.

**Do not change tick density when adding x span tiers.** Format-only changes stay within plan 004’s `PX_PER_X_TICK` clamps; if day labels collide at dense short spans, stop and reassess rather than silently densifying.

If full-dollar y labels clip the left margin after a tight-range tier, widen `margin.left` only after visual smoke.

Current formatters in `src/Graph.tsx`:

```82:108:src/Graph.tsx
    // Y precision follows peak−trough variance (one tier per draw).
    const formatEquityAxis = (value: d3.NumberValue) => {
      const n = Number(value);
      if (equityRange < 100) return `$${Math.round(n).toLocaleString('en-US')}`;
      const k = n / 1000;
      if (equityRange < 10000) return `$${k.toFixed(1)}k`;
      return `$${Math.round(k)}k`;
    };

    // X precision follows visible date span (one tier per draw).
    const MS_PER_DAY = 86_400_000;
    const spanDays = Math.abs(currentDate.getTime() - initialDate.getTime()) / MS_PER_DAY;
    const useDayLabels = spanDays <= 90;
    const crossesYear = initialDate.getFullYear() !== currentDate.getFullYear();
    const dateAxisFormatter = new Intl.DateTimeFormat(
      'en-US',
      useDayLabels
        ? crossesYear
          ? { month: 'short', day: 'numeric', year: 'numeric' }
          : { month: 'short', day: 'numeric' }
        : { month: 'short', year: 'numeric' }
    );

    const formatDateAxis = (value: Date | d3.NumberValue) => {
      const date = value instanceof Date ? value : new Date(value.valueOf());
      return dateAxisFormatter.format(date);
    };
```

## Why This Matters

Wrong y precision makes small portfolio moves look flat (whole `$k` on a $40 swing) or cluttered (full dollars on a wide band). Wrong x granularity makes short filtered ranges vague (repeated `Jul 2026`) or long histories noisy (day digits on every tick). Tiering by **variance** and **visible span** keeps all ticks in a render consistent. Separating axis compaction from tooltip precision preserves scanability without hiding exact values on hover.

## When to Apply

- D3 / SVG line charts where y values are currency and the meaningful “zoom level” is how much equity moves across the visible series—not absolute account size
- Time-series x-axes where label specificity should track how much calendar time the visible window covers
- Portfolio equity UIs where one global format rule fails across tight, mid, and wide historical ranges
- Not for tooltips, tables, or exports that should stay at full precision

## Examples

**Tight range (variance &lt; $100)** — peak $3,180, trough $3,140 → `equityRange = 40` → `$3,140`, `$3,160`.

**Small-to-medium ($100–$10k)** — peak $3,180, trough $2,980 → `equityRange = 200` → `$3.0k`, `$3.1k`.

**Mid portfolio, wider swing** — peak $104,200, trough $100,100 → `equityRange = 4,100` → `$100.1k`, `$104.2k` (tier is variance, not whether values exceed $100k).

**Wide range (≥ $10k)** — peak $140k, trough $100k → `equityRange = 40,000` → `$100k`, `$120k`, `$140k`.

**X-axis — short span** — ~1 week visible → `Jul 6`, `Jul 8`.

**X-axis — long span** — &gt; 90 days → `Jul 2026`, `Oct 2026` (no day digits).

**X-axis — short cross-year** — Dec 20 → Jan 10 → `Dec 20, 2025`, `Jan 5, 2026`.

**X-axis — threshold** — span exactly 90 days → day tier; span 91 days → month+year.

## Related

- [Stats strip P&L label syncs with chart range selection](stats-strip-range-label-sync.md) — stats strip needs lifted `activeRange` for plain-language labels; axis tiers intentionally avoid coupling to range button IDs
- [D3 equity chart hover tooltip sits too high above data points](../ui-bugs/graph-tooltip-vertical-offset.md) — same `src/Graph.tsx` chart; tooltip positioning and full-precision hover copy are separate from axis `tickFormat`
- Plan: `docs/plans/2026-07-28-005-feat-graph-axis-label-formats-plan.md` (month+year-only x rule superseded for short spans)
- Plan: `docs/plans/2026-07-29-003-feat-graph-x-axis-date-span-plan.md`
- Glossary: `CONCEPTS.md` — Peak−trough variance, Visible date span, Chart range
