import { useState, useEffect } from 'react';
import './App.css';
import Graph from './Graph';
import Table from './Table';

function App() {
	const [originalTimeline, setOriginalTimeline] = useState([]);
	const [timeline, setTimeline] = useState([]);
	const [account, setAccount] = useState({});

	useEffect(() => {
		const fetchData = async () => {
			const local = 'http://127.0.0.1:5001/algosus/us-central1/fetch';
			const production = 'https://us-central1-algosus.cloudfunctions.net/fetch';
			const url = production;
			await fetch(url)
				.then(response => response.json())
				.then(data => {
					setAccount(data.account);
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
