import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';

type props = {
  timeline: any[];
};

const Graph = (props: props) => {
  const { timeline } = props;
  //const [timeline, setTimeline] = useState(props.timeline);
  const [rendered, setRendered] = useState(false);
  const margin = 100;
  let ref = useRef(null);

  //returns in days
  const getDateDifference = (date1: Date, date2: Date) => {
    return Math.abs((date1.valueOf() - date2.valueOf()) / (1000 * 60 * 60 * 24));
  };

  /*
  useEffect(() => {
    const fetchData = async () => {
      const url = 'http://127.0.0.1:5001/algosus/us-central1/fetch';
      await fetch(url)
        .then(response => response.json())
        .then(data => {
          //setAccount(data.account);
          //setBuy(data.buy);
          //setSell(data.sell);
          setTimeline(Object.values(data.timeline));
        })
        .catch(err => console.log(err));
    };
    fetchData();
  }, []);
  */
  useEffect(() => {
    // skips first render
    if (!rendered) {
      setRendered(true);
      return;
    }
    //clears during render
    d3.select('#graph').remove();
    let svg = d3.select(ref.current);
    let g = svg
      .append('g')
      .attr('id', 'graph')
      .attr('transform', 'translate(' + 50 + ',' + 50 + ')');
    let w: number = Number(svg.attr('width')) - margin;
    let h: number = Number(svg.attr('height')) - margin;

    // sets graph title
    g.append('text')
      .attr('x', w / 2)
      .attr('y', 30)
      .style('text-anchor', 'middle')
      .style('font-size', '20px')
      .text('ez');

    // sets x axis title
    g.append('text')
      .attr('x', w / 2)
      .attr('y', h + 40)
      .style('text-anchor', 'middle')
      .style('font-size', '14px')
      .text('date');

    // sets y axis title
    g.append('text')
      .attr('x', -(w - margin) / 2)
      .attr('y', -40)
      .attr('transform', 'rotate(-90)')
      .style('text-anchor', 'middle')
      .style('font-size', '14px')
      .text('money');

    // defines x scale
    const initialDate = new Date((timeline[0] as any).date);
    const currentDate = new Date((timeline[timeline.length - 1] as any).date);
    const rangeDate = getDateDifference(initialDate, currentDate);
    let xScale = d3.scaleLinear().range([0, w]).domain([0, rangeDate]);

    // defines y scale
    const yMin = Math.min(...(timeline as any).map((d: any) => d.equity));
    const yMax = Math.max(...(timeline as any).map((d: any) => d.equity));
    const padding = (yMax - yMin) * 0.1;
    let yScale = d3
      .scaleLinear()
      .range([h, 0])
      .domain([yMin - padding, yMax + padding]);

    //x axis properties
    g.append('g')
      .attr('transform', 'translate(0,' + h + ')')
      .call(d3.axisBottom(xScale));

    //y axis properties
    // default y step
    g.append('g').call(d3.axisLeft(yScale).ticks(20));

    //toolTip for hover
    let toolTip = (s: string, d: any) => {
      let t = d3
        .select('body')
        .append('text')
        .attr('id', `toolTip`)
        .text(s)
        .style('font-size', '12px')
        .style('position', 'absolute')
        .style('visibility', 'hidden')
        .style('top', yScale(d.equity) + 110 + 'px')
        .style('left', xScale(getDateDifference(initialDate, new Date(d.date))) + 10 + 'px');
      return t;
    };

    var helper = d3
      .line()
      .y(function (d: any, i: any) {
        return yScale(d.equity);
      })
      .x(function (d: any, i) {
        return xScale(getDateDifference(initialDate, new Date(d.date)));
      });

    // line graph
    g.append('path')
      .attr('d', helper(timeline))
      .attr('fill', 'none')
      .attr('stroke', '#2296F3')
      .attr('stroke-width', 1.5);

    // adds circles to graph
    g.selectAll('circle.line')
      .data(timeline)
      .enter()
      .append('circle')
      .style('fill', '#2296F3')
      .style('opacity', 0)
      .attr('cx', (d: any) => xScale(getDateDifference(initialDate, new Date(d.date))))
      .attr('cy', (d: any) => yScale(d.equity))
      .attr('r', 28)
      .on('mouseover', (e, d: any) => {
        const cur = new Date(d.date);
        const month = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(cur);
        const date = cur.getDate();
        const year = cur.getFullYear();
        toolTip(`$${Number(d.equity).toFixed(2)} ${month} ${date}, ${year}`, d).style('visibility', 'visible');
      })
      .on('mouseout', (e, d: any) => {
        d3.select(`#toolTip`).remove();
      });
  }, [timeline]);

  return (
    <>
      <p>graph</p>
      <div>
        <svg ref={ref} height="500" width="600"></svg>
      </div>
    </>
  );
};

export default Graph;
