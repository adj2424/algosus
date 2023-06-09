import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import Graph from './Graph';
import Table from './Table';

function App() {
	const [originalTimeline, setOriginalTimeline] = useState([]);
	const [timeline, setTimeline] = useState([]);
	const [account, setAccount] = useState({});

	useEffect(() => {
		const fetchData = async () => {
			const url = 'https://us-central1-algosus.cloudfunctions.net/fetch';
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
