import React, { useState, useEffect } from 'react';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Button from '@mui/material/Button';
import ButtonGroup from '@mui/material/ButtonGroup';

type props = {
	timeline: any[];
	setTimeline: any;
	original: any[];
};

const GraphHeader = (props: props) => {
	let { timeline, setTimeline, original } = props;

	const [rendered, setRendered] = useState(false);
	const [equity, setEquity] = useState(0);
	const [profit, setProfit] = useState('');
	const [color, setColor] = useState('primary');

	//returns in days
	const getDateDifference = (date1: Date, date2: Date) => {
		return Math.abs((date1.valueOf() - date2.valueOf()) / (1000 * 60 * 60 * 24));
	};

	//change timeline based on time range
	const setRange = (range: string) => {
		let ranges: any[] = [];
		let difference = 1;
		if (range === '1D') {
			difference = 1;
		}
		//
		else if (range === '1W') {
			difference = 7;
		}
		//
		else if (range === '1M') {
			difference = 30;
		}
		//
		else if (range === '1YR') {
			difference = 365;
		}
		//
		else {
			setTimeline(original);
			return;
		}
		for (let i = original.length - 1; i >= 0; i--) {
			if (getDateDifference(new Date(), new Date(original[i].date)) <= difference) {
				ranges.push(original[i]);
			}
		}
		ranges = ranges.reverse();
		// edge case for 1 day
		if (ranges.length === 1) {
			const temp = {
				date: new Date().toString(),
				equity: ranges[0].equity
			};
			ranges.push(temp);
		}
		// edge case for 0 days meaning no data points are in range
		// will create two temporary points with latest equity
		if (ranges.length === 0) {
			let temp = {
				date: new Date().toString(),
				equity: original[original.length - 1].equity
			};
			ranges.push(temp);
			temp = {
				date: new Date().toString(),
				equity: original[original.length - 1].equity
			};
			ranges.push(temp);
		}
		//console.log(ranges);
		setTimeline(ranges);
	};

	useEffect(() => {
		// skips first render
		if (!rendered) {
			setRendered(true);
			return;
		}
		setEquity(timeline[timeline.length - 1].equity);
		const p = timeline[timeline.length - 1].equity - timeline[0].equity;
		let s = `$${Math.abs(p).toFixed(2)} (${((Math.abs(p) / timeline[0].equity) * 100).toFixed(2)}%)`;
		if (p > 0) {
			s = `+${s}`;
			setColor('success');
		}
		// negative profit
		else {
			s = `-${s}`;
			setColor('error');
		}
		setProfit(s);
	}, [timeline]);

	return (
		<Stack direction="row" spacing={1}>
			<Chip label={`$${equity.toFixed(2)}`} onClick={() => {}} />
			{color === 'success' ? (
				<Chip label={profit} variant="outlined" color="success" onClick={() => {}} />
			) : (
				<Chip label={profit} variant="outlined" color="error" onClick={() => {}} />
			)}
			<Divider orientation="vertical" flexItem />

			<ButtonGroup variant="outlined" color="inherit" aria-label="outlined button group">
				<Button size="small" onClick={() => setRange('1D')}>
					1D
				</Button>
				<Button size="small" onClick={() => setRange('1W')}>
					1W
				</Button>
				<Button size="small" onClick={() => setRange('1M')}>
					1M
				</Button>
				<Button size="small" onClick={() => setRange('1YR')}>
					1YR
				</Button>
				<Button size="small" onClick={() => setRange('ALL')}>
					ALL
				</Button>
			</ButtonGroup>
		</Stack>
	);
};

export default GraphHeader;
