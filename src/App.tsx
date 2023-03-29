import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import Graph from './Graph';
import Table from './Table';

function App() {
	const [originalTimeline, setOriginalTimeline] = useState([]);
	const [timeline, setTimeline] = useState([]);
	const [account, setAccount] = useState({});

	const test = async () => {
		await fetch('https://dvjl0e8mw9.execute-api.us-east-1.amazonaws.com/dev/fetch')
			.then(res => res.json())
			.then(data => console.log(data));
	};

	useEffect(() => {
		const fetchData = async () => {
			const url = 'http://127.0.0.1:5001/algosus/us-central1/fetch';
			await fetch(url)
				.then(response => response.json())
				.then(data => {
					setAccount(data.account);
					//setBuy(data.buy);
					//setSell(data.sell);
					setTimeline(Object.values(data.timeline));
					setOriginalTimeline(Object.values(data.timeline));
				})
				.catch(err => console.log(err));
		};
		fetchData();
	}, []);

	return (
		<div className="flex-container">
			<button onClick={test}>hi</button>
			<div className="graph">
				<Graph original={originalTimeline} timeline={timeline} setTimeline={setTimeline} />
			</div>
			<div className="table">
				<Table account={account} />
			</div>
		</div>
	);
}

export default App;
