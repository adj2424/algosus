import { onRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { ThinkingLevel } from '@google/genai';
import { GeminiClient, AlpacaClient } from './config';
import { UpdateProfile } from './update';
import { requireApiKey } from './auth';

const TICKER_PATTERN = /^[A-Z]{1,5}$/;

const STOCK_PICK_PROMPT =
  'Provide an analysis and recommendation for the top 5 stocks that are likely to yield long-term profits based on current market trends and data.\n\nConsider the following factors when making recommendations:\n\n- **Market Trends**: Analyze current market conditions and consider economic indicators that might influence stock performance.\n- **Industry Analysis**: Examine sector performance and consider which industries are poised for growth.\n- **Historical Performance**: Look into the past performance of the stocks to identify patterns of consistent growth or resilience.\n\n\n# Output Format\n\nProvide a list of the top 5 recommended stocks in an array format each ticker symbol separated by a coma. Do not provide any commentary about the thought process, only the ticker symbols\n\n# Example\n\nExample output response for picking out stocks \n\n[TICKER1, TICKER2, TICKER3, TICKER4, TICKER5]\n';

// The model is asked for "[TICKER1, ..., TICKER5]" but its output is not
// guaranteed; keep only strings that actually look like ticker symbols.
const getTickerSymbols = (text: string) => {
  const tickers = text
    .replace(/[[\]\s]/g, '')
    .split(',')
    .map(ticker => ticker.toUpperCase())
    .filter(ticker => TICKER_PATTERN.test(ticker));
  return [...new Set(tickers)].slice(0, 5);
};

const buy = async () => {
  const account = await AlpacaClient.getAccount();
  if (account.trading_blocked) {
    throw new Error('Account is restricted from trading');
  }

  let options: string[] = [];
  // ask Gemini which stocks to buy; failures propagate to the caller
  // instead of being swallowed (a silent failure looked like a passing buy)
  try {
    const res = await GeminiClient.models.generateContent({
      model: 'gemini-3.5-flash-lite',
      contents: STOCK_PICK_PROMPT,
      config: {
        temperature: 0.8,
        maxOutputTokens: 512,
        thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH }
      }
    });

    options = getTickerSymbols(res.text ?? '');
    if (options.length === 0) {
      throw new Error(`Unable to generate stock picks from response: ${res.text}`);
    }
  } catch (error) {
    console.error('Error running buy:', error);
    throw error;
  }

  // buy 80% equity in 5 stocks and 20% padding
  const buyAmount = (Number(account.equity) * 0.8) / options.length;
  await Promise.all(
    options.map(async option => {
      try {
        const latestTrade = await AlpacaClient.getLatestTrade(option);
        // fractional shares doesn't work anymore??? idk y
        // floor instead of round so a single order never exceeds its budget
        const qty = Math.floor(buyAmount / latestTrade.Price);
        if (qty < 1) {
          console.log(`skipping ${option}: price ${latestTrade.Price} exceeds per-stock budget`);
          return;
        }
        await AlpacaClient.createOrder({
          symbol: option,
          qty: qty,
          side: 'buy',
          type: 'market',
          time_in_force: 'gtc'
        });
      } catch (error) {
        throw new Error(`error buying ${option}: ${error} `);
      }
    })
  ).catch(error => {
    console.error('Error buying stocks:', error);
    throw error;
  });
  // refresh the profile first so the DB reflects any orders that did succeed
  await UpdateProfile();
};

export const BuyFunc = onRequest(async (request, response) => {
  if (!requireApiKey(request, response)) return;
  try {
    await buy();
  } catch (error) {
    console.error('Error running buy:', error);
    response.status(500).send(`Error running buy: ${error}`);
    return;
  }
  response.send('buy done');
});

// scheduled function runs monday at 10:00am
export const ScheduleBuy = onSchedule(
  {
    schedule: '0 10 * * 1',
    timeZone: 'America/New_York'
  },
  async () => {
    try {
      await buy();
    } catch (error) {
      console.error('Error running scheduled buy:', error);
      // rethrow so the invocation is marked failed in Cloud Functions
      throw error;
    }
  }
);
