# algosus

Stock trading bot for educational purposes and fun. Built with React, TypeScript, D3.js, Material UI and uses Google Cloud Platform (GCP) as the BaaS. A previous live dashboard was at [algosus.vercel.app](https://algosus.vercel.app/); **automatic Vercel deploys are disabled** — see `vercel.json`.

## Git workflow

All development uses the **`main`** branch only. Clone, commit, and push to `main`; do not use feature branches unless you have a specific reason to isolate work.

## Features

- The AI trading bot uses the ChatGPT API to generate optimal stocks to buy and sell.
- It leverages the Alpaca API for executing trades in the market.
- Performs scheduled cloud functions in GCP to run the trading bot at specific times.
- Simple user interface to view the trading data and its portfolio.

## Getting Started

This is an example of how to run my project locally.
To get a local copy up and running follow these simple example steps.

1. Clone the repo
   ```sh
   git clone https://github.com/adj2424/algosus.git
   ```
2. Install NPM packages
   ```sh
   npm i
   ```
3. Start the application
   ```sh
   npm run dev
   ```
