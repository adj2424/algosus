import { useEffect, useState } from 'react';
import './App.css';
import Graph from './Graph';
import Table from './Table';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import GitHubIcon from '@mui/icons-material/GitHub';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import { RANGE_LABELS, type ChartRange } from './GraphHeader';

type StatsStripProps = {
  account: any;
  timeline: any[];
  loading: boolean;
  activeRange: ChartRange;
};

// Inlined rather than split into its own file: this strip has a single
// consumer (App) and shares App's account/timeline state directly.
function StatsStrip({ account, timeline, loading, activeRange }: StatsStripProps) {
  if (loading) {
    return (
      <div className="stats-strip" aria-label="Portfolio stats loading">
        {[0, 1, 2].map(i => (
          <Skeleton key={i} variant="rounded" width={130} height={58} />
        ))}
      </div>
    );
  }

  const currentEquity =
    account.current_equity ?? (timeline.length ? timeline[timeline.length - 1].equity : (account.initial_equity ?? 0));
  const baseline = timeline.length ? timeline[0].equity : (account.initial_equity ?? currentEquity);
  const delta = currentEquity - baseline;
  const deltaPct = baseline ? (delta / baseline) * 100 : 0;
  const positive = delta >= 0;
  const positionsCount = account.positions ? account.positions.length : 0;

  return (
    <div className="stats-strip" role="group" aria-label="Portfolio stats">
      <div className="stat">
        <span className="stat-label">Equity</span>
        <span className="stat-value">${currentEquity.toFixed(2)}</span>
      </div>
      <div className={`stat stat--${positive ? 'positive' : 'negative'}`}>
        <span className="stat-label">{RANGE_LABELS[activeRange]}</span>
        <span className="stat-value">
          {positive ? <TrendingUpIcon fontSize="small" /> : <TrendingDownIcon fontSize="small" />}
          {positive ? '+' : '-'}${Math.abs(delta).toFixed(2)} ({Math.abs(deltaPct).toFixed(2)}%)
        </span>
      </div>
      <div className="stat">
        <span className="stat-label">Holdings</span>
        <span className="stat-value">{positionsCount}</span>
      </div>
    </div>
  );
}

function App() {
  const [originalTimeline, setOriginalTimeline] = useState<any[]>([]);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [account, setAccount] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [activeRange, setActiveRange] = useState<ChartRange>('ALL');

  useEffect(() => {
    const fetchData = async () => {
      const url = import.meta.env.VITE_API_URL;
      if (!url) {
        console.error('VITE_API_URL is not set. Check .env.development / .env.production.');
        setFetchError(true);
        setLoading(false);
        return;
      }
      await fetch(url)
        .then(response => response.json())
        .then(data => {
          setAccount(data.account);
          setTimeline(Object.values(data.timeline));
          setOriginalTimeline(Object.values(data.timeline));
        })
        .catch(err => {
          console.log(err);
          setFetchError(true);
        })
        .finally(() => setLoading(false));
    };
    fetchData();
  }, []);

  const isEmpty = !loading && !fetchError && timeline.length === 0;

  return (
    <div className="page">
      <header className="top-bar">
        <Typography variant="h6" component="span" className="brand">
          Algosus
        </Typography>
        <Stack direction="row" spacing={0.5}>
          <Button
            size="small"
            href="https://github.com/adj2424/algosus"
            target="_blank"
            rel="noreferrer"
            startIcon={<GitHubIcon />}
          >
            Code
          </Button>
          <Button
            size="small"
            href="https://www.linkedin.com/in/alanjiang24/"
            target="_blank"
            rel="noreferrer"
            startIcon={<LinkedInIcon />}
          >
            LinkedIn
          </Button>
          <Button
            size="small"
            href="https://alanjiang.xyz"
            target="_blank"
            rel="noreferrer"
            startIcon={<AccountCircleIcon />}
          >
            Portfolio
          </Button>
        </Stack>
      </header>

      <main className="content-grid">
        <section className="chart-column">
          <StatsStrip account={account} timeline={timeline} loading={loading} activeRange={activeRange} />
          <Card className="chart-card" variant="outlined">
            {fetchError ? (
              <div className="chart-error" role="alert">
                <Typography variant="body1" color="text.secondary">
                  Couldn't load live trading data right now. Please refresh to try again.
                </Typography>
              </div>
            ) : (
              <Graph
                original={originalTimeline}
                timeline={timeline}
                setTimeline={setTimeline}
                loading={loading}
                empty={isEmpty}
                activeRange={activeRange}
                setActiveRange={setActiveRange}
              />
            )}
          </Card>
        </section>

        <section className="holdings-column">
          <Table account={account} loading={loading} />
        </section>

        <section className="about-column">
          <Card variant="outlined">
            <CardContent>
              <Typography gutterBottom variant="h6" component="div">
                About this project
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Hi! This is a stock trading bot I built for educational purposes and for fun. It was initiated in
                February 2023 with a starting equity of $3000 USD. Built with React, TypeScript, D3.js, Material UI and
                uses Google Cloud Platform (GCP) as the BaaS.
              </Typography>
              <ul className="about-list">
                <Typography variant="body2" color="text.secondary" component="li">
                  The AI trading bot uses the Gemini API to generate optimal stocks to buy and sell
                </Typography>
                <Typography variant="body2" color="text.secondary" component="li">
                  It leverages the Alpaca API for executing trades in the market
                </Typography>
                <Typography variant="body2" color="text.secondary" component="li">
                  Performs scheduled cloud functions in GCP to run the trading bot at specific times
                </Typography>
                <Typography variant="body2" color="text.secondary" component="li">
                  Simple user interface to view the trading data and its portfolio
                </Typography>
              </ul>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}

export default App;
