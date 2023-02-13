import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';

const Graph = () => {
  const [account, setAccount] = useState({});
  const [buy, setBuy] = useState({});
  const [sell, setSell] = useState({});
  const [timeline, setTimeline] = useState([]);
  const [rendered, setRendered] = useState(false);
  const margin = 100;
  let ref = useRef(null);

  //returns in days
  const getDateDifference = (date1: Date, date2: Date) => {
    return Math.abs((date1.valueOf() - date2.valueOf()) / (1000 * 60 * 60 * 24));
  };

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
    const range = getDateDifference(initialDate, currentDate);

    const clone = timeline[0] as any;

    console.log(range);

    let xScale = d3.scaleLinear().range([0, w]).domain([0, range]);
    // .domain(
    //   timeline.map((_d, i) => {
    //     return String(i);
    //   })

    //.padding(0.2);

    // defines y scale
    // let yMin = props.min === null ? 0 : props.min;
    // let yMax = props.max;
    // // checks for null
    // if (yMax === null) {
    //   yMax = Math.ceil(Math.max(...data.map(d => d[key2])) * 1.1);
    // }
    // // checks if yMin and yMax is valid
    // if (yMin > yMax) {
    //   yMin = 0;
    //   yMax = Math.ceil(Math.max(...data.map(d => d[key2])) * 1.1);
    // }
    let yScale = d3.scaleLinear().range([h, 0]).domain([0, 2000]);

    //x axis properties
    g.append('g')
      .attr('transform', 'translate(0,' + h + ')')
      .call(d3.axisBottom(xScale));

    //y axis properties
    //let yStep = props.step === null ? null : props.step;
    //let tickValues: any[] = [];

    // default y step
    //if (yStep === null) {
    g.append('g').call(d3.axisLeft(yScale).ticks(20));
    //}
    //
    /*
    else {
      //creates all tick values in array
      let i = yMin;
      while (i <= yMax) {
        tickValues = [...tickValues, i];
        i += yStep;
      }
      g.append('g').call(d3.axisLeft(yScale).tickValues(tickValues).tickFormat(d3.format(',.1f')));
    }
    */

    var line1 = d3
      .line()
      .y(function (d: any, i: any) {
        return yScale(d.equity);
      })
      .x(function (d: any, i) {
        return xScale(getDateDifference(initialDate, new Date(d.date)));
      });
    //.interpolate('linear');

    g.append('path')
      .attr('d', line1(timeline))
      .attr('fill', 'none')
      .attr('stroke', 'steelblue')
      .attr('stroke-width', 1.5);
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
