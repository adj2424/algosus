import { useEffect, useRef, useState } from 'react';
import './Graph.css';
import * as d3 from 'd3';
import GraphHeader, { type ChartRange } from './GraphHeader';
import Skeleton from '@mui/material/Skeleton';

type props = {
  timeline: any[];
  setTimeline: any;
  original: any[];
  loading: boolean;
  empty: boolean;
  activeRange: ChartRange;
  setActiveRange: (range: ChartRange) => void;
};

const Graph = (props: props) => {
  const { timeline, setTimeline, original, loading, empty, activeRange, setActiveRange } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const svgHostRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  // Fluid sizing: observe the mount div directly instead of a one-shot
  // offsetWidth/offsetHeight read, so the chart redraws on any resize
  // (window resize, sidebar collapse, orientation change).
  useEffect(() => {
    const node = svgHostRef.current;
    if (!node) return;
    const observer = new ResizeObserver(entries => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setSize(prev => (prev.width === width && prev.height === height ? prev : { width, height }));
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const node = svgHostRef.current;
    if (!node) return;

    d3.select(node).selectAll('svg').remove();
    d3.select(containerRef.current).selectAll('.graph-tooltip').remove();

    const { width, height } = size;
    // Guard against degenerate input so the pre-observer paint (or an
    // empty/loading state) never produces NaN scales.
    if (loading || empty || timeline.length === 0 || !width || !height) return;

    const margin = { top: 30, right: 20, bottom: 36, left: 60 };
    const w = Math.max(width - margin.left - margin.right, 0);
    const h = Math.max(height - margin.top - margin.bottom, 0);
    if (!w || !h) return;

    const svg = d3.select(node).append('svg').attr('width', width).attr('height', height);
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const initialDate = new Date((timeline[0] as any).date);
    const currentDate = new Date((timeline[timeline.length - 1] as any).date);
    const xScale = d3.scaleTime().domain([initialDate, currentDate]).range([0, w]);

    // defines y scale
    const yMin = Math.min(...(timeline as any).map((d: any) => d.equity));
    const yMax = Math.max(...(timeline as any).map((d: any) => d.equity));
    const equityRange = yMax - yMin;
    const padding = equityRange * 0.1 || 1;
    const yScale = d3
      .scaleLinear()
      .range([h, 0])
      .domain([yMin - padding, yMax + padding]);

    const rootStyles = getComputedStyle(document.documentElement);
    const inkMuted = rootStyles.getPropertyValue('--color-ink-muted').trim() || '#4b5563';
    const positiveColor = rootStyles.getPropertyValue('--color-positive').trim() || '#0f9d58';
    const negativeColor = rootStyles.getPropertyValue('--color-negative').trim() || '#d33f3f';

    const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
    const PX_PER_X_TICK = 80;
    const PX_PER_Y_TICK = 40;
    const xTickCount = Math.min(clamp(Math.floor(w / PX_PER_X_TICK), 3, 12), timeline.length);
    const yTickCount = clamp(Math.floor(h / PX_PER_Y_TICK), 4, 10);

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

    const styleAxis = (selection: d3.Selection<SVGGElement, unknown, null, undefined>) => {
      selection.select('.domain').attr('stroke', inkMuted).attr('stroke-width', 1);
      selection.selectAll('.tick line').attr('stroke', inkMuted).attr('stroke-width', 1);
      selection
        .selectAll('.tick text')
        .attr('fill', inkMuted)
        .attr('font-size', '11px')
        .attr('font-family', rootStyles.getPropertyValue('--font-body').trim() || 'system-ui, sans-serif');
    };

    const xAxis = d3.axisBottom(xScale).ticks(xTickCount).tickFormat(formatDateAxis);
    const yAxis = d3.axisLeft(yScale).ticks(yTickCount).tickFormat(formatEquityAxis);

    g.append('g')
      .attr('transform', 'translate(0,' + h + ')')
      .call(xAxis)
      .call(styleAxis);
    g.append('g').call(yAxis).call(styleAxis);

    const profit = timeline[timeline.length - 1].equity - timeline[0].equity;
    const color = profit >= 0 ? positiveColor : negativeColor;

    const line = d3
      .line()
      .y(function (d: any) {
        return yScale(d.equity);
      })
      .x(function (d: any) {
        return xScale(new Date(d.date));
      });

    // line graph
    g.append('path')
      .datum(timeline)
      .attr('d', line as any)
      .attr('fill', 'none')
      .attr('stroke', color)
      .attr('stroke-width', 2);

    // tooltip scoped to the chart container instead of document.body, so it
    // is positioned/cleaned up relative to this component rather than leaking
    // into the page body.
    const TOOLTIP_OFFSET_PX = -24;
    const TOOLTIP_OFFSET_PX_LEFT = 12;
    const tooltip = d3.select(containerRef.current).append('div').attr('class', 'graph-tooltip');

    // hidden circles make the tooltip hover target easier to hit
    g.selectAll('circle.point')
      .data(timeline)
      .enter()
      .append('circle')
      .attr('class', 'point')
      .style('opacity', 0)
      .attr('cx', (d: any) => xScale(new Date(d.date)))
      .attr('cy', (d: any) => yScale(d.equity))
      .attr('r', 16)
      .on('mouseover', (_event, d: any) => {
        const cur = new Date(d.date);
        const month = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(cur);
        tooltip
          .text(`$${Number(d.equity).toFixed(2)} · ${month} ${cur.getDate()}, ${cur.getFullYear()}`)
          .style('left', `${margin.left + xScale(new Date(d.date)) + TOOLTIP_OFFSET_PX_LEFT}px`)
          .style('top', `${margin.top + yScale(d.equity) - TOOLTIP_OFFSET_PX}px`)
          .style('opacity', 1);
      })
      .on('mouseout', () => tooltip.style('opacity', 0));
  }, [timeline, size, loading, empty]);

  return (
    <div className="graph-container" ref={containerRef}>
      <div className="graph-header">
        <GraphHeader
          original={original}
          timeline={timeline}
          setTimeline={setTimeline}
          activeRange={activeRange}
          setActiveRange={setActiveRange}
        />
      </div>
      <div className="graph-svg-host" ref={svgHostRef} role="img" aria-label="Equity over time line chart">
        {loading && <Skeleton variant="rounded" sx={{ width: '100%', height: '100%' }} />}
        {!loading && empty && <div className="graph-empty">No trading history yet.</div>}
      </div>
    </div>
  );
};

export default Graph;
