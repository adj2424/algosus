import { useEffect, useRef, useState } from 'react';
import './Graph.css';
import * as d3 from 'd3';
import GraphHeader from './GraphHeader';
import Skeleton from '@mui/material/Skeleton';

type props = {
  timeline: any[];
  setTimeline: any;
  original: any[];
  loading: boolean;
  empty: boolean;
};

const Graph = (props: props) => {
  const { timeline, setTimeline, original, loading, empty } = props;
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

  //returns in days
  const getDateDifference = (date1: Date, date2: Date) => {
    return Math.abs((date1.valueOf() - date2.valueOf()) / (1000 * 60 * 60 * 24));
  };

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

    // defines x scale
    const initialDate = new Date((timeline[0] as any).date);
    const currentDate = new Date((timeline[timeline.length - 1] as any).date);
    const rangeDate = getDateDifference(initialDate, currentDate) || 1;
    const xScale = d3.scaleLinear().range([0, w]).domain([0, rangeDate]);

    // defines y scale
    const yMin = Math.min(...(timeline as any).map((d: any) => d.equity));
    const yMax = Math.max(...(timeline as any).map((d: any) => d.equity));
    const padding = (yMax - yMin) * 0.1 || 1;
    const yScale = d3
      .scaleLinear()
      .range([h, 0])
      .domain([yMin - padding, yMax + padding]);

    //x axis properties
    g.append('g')
      .attr('transform', 'translate(0,' + h + ')')
      .call(d3.axisBottom(xScale).ticks(Math.min(6, timeline.length)));
    //y axis properties
    g.append('g').call(d3.axisLeft(yScale).ticks(6));

    const rootStyles = getComputedStyle(document.documentElement);
    const positiveColor = rootStyles.getPropertyValue('--color-positive').trim() || '#0f9d58';
    const negativeColor = rootStyles.getPropertyValue('--color-negative').trim() || '#d33f3f';

    const profit = timeline[timeline.length - 1].equity - timeline[0].equity;
    const color = profit >= 0 ? positiveColor : negativeColor;

    const line = d3
      .line()
      .y(function (d: any) {
        return yScale(d.equity);
      })
      .x(function (d: any) {
        return xScale(getDateDifference(initialDate, new Date(d.date)));
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
    const tooltip = d3.select(containerRef.current).append('div').attr('class', 'graph-tooltip');

    // hidden circles make the tooltip hover target easier to hit
    g.selectAll('circle.point')
      .data(timeline)
      .enter()
      .append('circle')
      .attr('class', 'point')
      .style('opacity', 0)
      .attr('cx', (d: any) => xScale(getDateDifference(initialDate, new Date(d.date))))
      .attr('cy', (d: any) => yScale(d.equity))
      .attr('r', 16)
      .on('mouseover', (_event, d: any) => {
        const cur = new Date(d.date);
        const month = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(cur);
        tooltip
          .text(`$${Number(d.equity).toFixed(2)} · ${month} ${cur.getDate()}, ${cur.getFullYear()}`)
          .style('left', `${margin.left + xScale(getDateDifference(initialDate, new Date(d.date)))}px`)
          .style('top', `${margin.top + yScale(d.equity) - 32}px`)
          .style('opacity', 1);
      })
      .on('mouseout', () => tooltip.style('opacity', 0));
  }, [timeline, size, loading, empty]);

  return (
    <div className="graph-container" ref={containerRef}>
      <div className="graph-header">
        <GraphHeader original={original} timeline={timeline} setTimeline={setTimeline} />
      </div>
      <div className="graph-svg-host" ref={svgHostRef} role="img" aria-label="Equity over time line chart">
        {loading && <Skeleton variant="rounded" sx={{ width: '100%', height: '100%' }} />}
        {!loading && empty && <div className="graph-empty">No trading history yet.</div>}
      </div>
    </div>
  );
};

export default Graph;
