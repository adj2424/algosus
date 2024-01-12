import { useState, useEffect, useRef } from 'react';
import './Graph.css';
import * as d3 from 'd3';
import GraphHeader from './GraphHeader';

type props = {
	timeline: any[];
	setTimeline: any;
	original: any[];
	width: number;
	height: number;
};

const Graph = (props: props) => {
	const { timeline, setTimeline, original, width, height } = props;
	console.log(width, height);
	const [rendered, setRendered] = useState(false);
	const margin = 100;
	let ref = useRef(null);

	//returns in days
	const getDateDifference = (date1: Date, date2: Date) => {
		return Math.abs((date1.valueOf() - date2.valueOf()) / (1000 * 60 * 60 * 24));
	};

	useEffect(() => {
		// skips first render
		if (!rendered) {
			setRendered(true);
			return;
		}
		//clears during render
		d3.select('#graph').remove();
		let svg = d3
			.select(ref.current)
			.append('svg')
			.attr('width', width * 0.95)
			.attr('height', height);
		let g = svg
			.attr('id', 'graph')
			.append('g')
			.attr('transform', 'translate(' + 80 + ',' + 50 + ')');
		let w: number = Number(svg.attr('width')) - margin;
		let h: number = Number(svg.attr('height')) - margin;

		// sets x axis title
		g.append('text')
			.attr('x', w / 2)
			.attr('y', h + 40)
			.style('text-anchor', 'middle')
			.style('font-size', '14px')
			.text('DATE');

		// sets y axis title
		g.append('text')
			.attr('x', -h / 2)
			.attr('y', -41)
			.attr('transform', 'rotate(-90)')
			.style('text-anchor', 'middle')
			.style('font-size', '14px')
			.text('EQUITY');

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
		g.append('g').call(d3.axisLeft(yScale).ticks(10));

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
				.style('pointer-events', 'none')
				.style('top', yScale(d.equity) + 55 + 'px')
				.style('left', xScale(getDateDifference(initialDate, new Date(d.date))) + 80 + 'px');
			return t;
		};

		let helper = d3
			.line()
			.y(function (d: any, i: any) {
				return yScale(d.equity);
			})
			.x(function (d: any, i) {
				return xScale(getDateDifference(initialDate, new Date(d.date)));
			});

		const profit = timeline[timeline.length - 1].equity - timeline[0].equity;
		let color = profit >= 0 ? '#4caf50' : '#ef5350';
		// line graph
		g.append('path').attr('d', helper(timeline)).attr('fill', 'none').attr('stroke', color).attr('stroke-width', 1.5);

		// adds hidden circles to graph
		// this is to make tooltip hover easier as user can hover over the entire circle
		g.selectAll('circle.line')
			.data(timeline)
			.enter()
			.append('circle')
			.style('opacity', 0)
			.attr('cx', (d: any) => xScale(getDateDifference(initialDate, new Date(d.date))))
			.attr('cy', (d: any) => yScale(d.equity))
			.attr('r', 30)
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
		<div className="graph-container">
			<div className="graph-header">
				<GraphHeader original={original} timeline={timeline} setTimeline={setTimeline} />
			</div>
			<div ref={ref}></div>
		</div>
	);
};

export default Graph;
