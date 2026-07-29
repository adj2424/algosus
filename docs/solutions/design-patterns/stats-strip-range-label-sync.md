---
title: Stats strip P&L label syncs with chart range selection
date: 2026-07-29
category: design-patterns
module: frontend
problem_type: design_pattern
component: frontend_stimulus
severity: low
applies_when:
  - "A stats strip displays P&L from a filtered timeline while the label text is hardcoded or owned by a different component than the range controls"
  - "Chart range buttons live in GraphHeader but a sibling StatsStrip in App must show matching plain-language range wording"
  - "P&L dollar and percent already baseline on filtered timeline[0] but the label still says All-time or another fixed string"
tags: [react, frontend, stats-strip, graph-header, chart-range, pnl-label, prop-drilling, controlled-state, dashboard]
---

# Stats strip P&L label syncs with chart range selection

## Context

The algosus dashboard shows a stats strip above the equity chart: Equity, P&L (dollar + percent), and Holdings. Range buttons (`1D` / `1W` / `1M` / `1YR` / `ALL`) live in `GraphHeader`; clicking one filters `timeline` in `App` via `setTimeline`, and the chart redraws from that filtered series.

P&L math already followed the filtered window: `StatsStrip` baselines on `timeline[0].equity` and current on the last point (or `account.current_equity`). After selecting `1W`, the number reflected the past week — but the label was hardcoded `All-time`. Visitors saw a range-relative delta with all-time wording: a misleading mismatch, not a math bug.

Root cause: `activeRange` was private `useState` inside `GraphHeader`. `StatsStrip` is a sibling in `App` and had no access to which range was selected. `timeline` alone is insufficient for the label because the product wants plain-language labels (`Past week`) not button codes (`1W`).

## Guidance

**Lift shared UI state to the owner of shared data.** `App` already owns `timeline`, `setTimeline`, and `originalTimeline`. Range selection is the same concern: add `activeRange` (default `'ALL'`) and `setActiveRange` in `App`, pass them through `Graph` into `GraphHeader`, and pass `activeRange` into `StatsStrip`.

**Make range controls controlled, not local.** Remove `GraphHeader`'s internal `useState` for `activeRange`. `setRange` calls `setActiveRange(range)` from props before filtering, keeping day thresholds, edge-case padding, and `RANGES` unchanged.

**Single map from range code to display label.** Export one lookup next to the range type definition:

| `ChartRange` | Label |
|---|---|
| `1D` | Today |
| `1W` | Past week |
| `1M` | Past month |
| `1YR` | Past year |
| `ALL` | All time |

Use `RANGE_LABELS[activeRange]` in `StatsStrip`. Source strings in normal case; `.stat-label` in `App.css` uppercases via CSS.

**Do not recompute P&L from `activeRange`.** Continue deriving baseline from filtered `timeline[0]`. The fix is wording sync, not math. Aligning the label with existing range-relative math is intentional; restoring since-start-only P&L would be a separate product change.

**Prop-drill pattern matches existing timeline wiring.** Same path as `timeline` / `setTimeline`: `App` → `Graph` → `GraphHeader`. No Context needed for a single consumer pair.

```9:15:src/GraphHeader.tsx
export const RANGE_LABELS: Record<ChartRange, string> = {
  '1D': 'Today',
  '1W': 'Past week',
  '1M': 'Past month',
  '1YR': 'Past year',
  ALL: 'All time'
};
```

```52:54:src/App.tsx
      <div className={`stat stat--${positive ? 'positive' : 'negative'}`}>
        <span className="stat-label">{RANGE_LABELS[activeRange]}</span>
        <span className="stat-value">
```

```73:73:src/App.tsx
  const [activeRange, setActiveRange] = useState<ChartRange>('ALL');
```

## Why This Matters

Label–value mismatches erode trust in financial UI faster than missing data. Here the number was already correct for the selected window; the static `All-time` string made shorter ranges look broken. Lifting one enum state and a label map fixes the mismatch with minimal surface area and preserves the existing filter logic.

## When to Apply

- Sibling components must reflect the same discrete UI mode (range, tab, period) while one component mutates shared derived data (filtered series)
- Display labels should be human-readable but state keys stay short codes for buttons and logic
- The derived values already follow filtered data; only the descriptor text is stale

**Not for:** changing how ranges filter timeline points, changing P&L baseline semantics, or adding new range buttons without updating `RANGE_LABELS`

## Examples

**Default load** — `activeRange === 'ALL'`, full timeline → label `All time`, P&L from first to last timeline point.

**Past week** — click `1W` → `setActiveRange('1W')`, timeline filtered to ~7 days → label `Past week`, P&L from first point in that window.

**Today** — click `1D` → label `Today`; single-point edge case still pads two points in `setRange` as before.

**Loading** — skeleton strip has no range label; no range-aware copy required during load.

## Related

- Plan: `docs/plans/2026-07-29-002-feat-range-pnl-label-plan.md`
- [D3 equity chart axis labels follow peak-trough variance tiers](graph-axis-label-variance-tiers.md) — axis tiers derive from visible `timeline`, not range button IDs; complementary “derive display from shared filtered data” pattern
- Prior stats-strip plan: `docs/plans/2026-07-27-004-feat-modern-mobile-ui-plan.md` (KTD4 since-start intent vs shipped range-relative baseline)
