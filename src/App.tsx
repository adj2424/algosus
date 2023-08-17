import { useState, useEffect } from 'react';
import './App.css';
import Graph from './Graph';
import Table from './Table';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import GitHubIcon from '@mui/icons-material/GitHub';
import LinkedInIcon from '@mui/icons-material/LinkedIn';

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
		<>
			<div className="flex-container">
				<Card className="graph" variant="outlined">
					<Graph original={originalTimeline} timeline={timeline} setTimeline={setTimeline} />
					<Divider variant="middle" />
					<CardContent>
						<Typography gutterBottom variant="h5" component="div">
							Algosus
						</Typography>
						<Typography variant="body1" color="text.secondary">
							Hi! This is a stock trading bot I built for educational purposes and for fun. It was initiated in February
							2023 with a starting equity of $3000 USD. Built with React, TypeScript, D3.js, Material UI and uses Google
							Cloud Platform (GCP) as the BaaS.
						</Typography>
						<ul>
							<Typography variant="body1" color="text.secondary">
								<li>The AI trading bot uses the ChatGPT API to generate optimal stocks to buy and sell</li>
								<li>It leverages the Alpaca API for executing trades in the market</li>
								<li>Performs scheduled cloud functions in GCP to run the trading bot at specific times</li>
								<li>Simple user interface to view the trading data and its portfolio</li>
							</Typography>
						</ul>
					</CardContent>
					<CardActions>
						<Button
							onClick={() => {
								window.open('https://github.com/adj2424/algosus', '_blank');
							}}
							endIcon={<GitHubIcon />}
						>
							Source Code
						</Button>
						<Button
							onClick={() => {
								window.open('https://www.linkedin.com/in/alanjiang24/', '_blank');
							}}
							endIcon={<LinkedInIcon />}
						>
							LinkedIn
						</Button>
						<Button
							onClick={() => {
								window.open('https://alanjiang.xyz', '_blank');
							}}
							endIcon={<AccountCircleIcon />}
						>
							Portfolio
						</Button>
					</CardActions>
				</Card>
				<div className="table">
					<Table account={account} />
				</div>
			</div>
		</>
	);
}

export default App;
