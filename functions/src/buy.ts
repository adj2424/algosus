import { onRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { Openai, AlpacaClient } from './config';
import { UpdateProfile } from './update';
import dotenv from 'dotenv';

dotenv.config();

const getTickerSymbols = (text: string) => {
  const array = text.replace(/[\[\]\s]/g, '').split(',');
  return array.length > 5 ? array.slice(-5) : array;
};

const buy = async () => {
  const account = await AlpacaClient.getAccount();
  if (account.trading_blocked) {
    console.error('Account is restricted from trading');
    return;
  }

  let options: string[] = [];

  try {
    // ask openai which stocks to buy
    const res = await Openai.responses.create({
      model: 'gpt-4.1-nano',
      input: [
        {
          role: 'system',
          content: [
            {
              type: 'input_text',
              text: 'Provide an analysis and recommendation for the top 5 stocks that are likely to yield long-term profits based on current market trends and data.\n\nConsider the following factors when making recommendations:\n\n- **Market Trends**: Analyze current market conditions and consider economic indicators that might influence stock performance.\n- **Industry Analysis**: Examine sector performance and consider which industries are poised for growth.\n- **Historical Performance**: Look into the past performance of the stocks to identify patterns of consistent growth or resilience.\n\n\n# Output Format\n\nProvide a list of the top 5 recommended stocks in an array format each ticker symbol separated by a coma. Do not provide any commentary about the thought process, only the ticker symbols\n\n# Example\n\nExample output response for picking out stocks \n\n[TICKER1, TICKER2, TICKER3, TICKER4, TICKER5]\n'
            }
          ]
        }
      ],
      text: {
        format: {
          type: 'text'
        }
      },
      reasoning: {},
      tools: [],
      temperature: 0.8,
      max_output_tokens: 512,
      top_p: 1,
      store: true
    });

    const openApiResponse = res.output_text;
    options = getTickerSymbols(openApiResponse);
  } catch (error) {
    console.error('Error fetching data from OpenAI:', error);
  }

  // buy 80% equity in 5 stocks and 20% padding
  const buyAmount = (account.equity * 0.8) / options.length;
  options.map(async option => {
    try {
      // get quantity of shares from latest price
      const latestPrice = await fetch(`https://data.alpaca.markets/v2/stocks/${option}/trades/latest`, {
        headers: {
          'APCA-API-KEY-ID': process.env.ALPACA_API_KEY!,
          'APCA-API-SECRET-KEY': process.env.ALPACA_SECRET_KEY!
        }
      })
        .then(res => res.json())
        .then(data => data.trade.p);
      // fractional shares doesn't work anymore??? idk y
      const qty = (buyAmount / latestPrice).toFixed(0);
      await AlpacaClient.createOrder({
        symbol: option,
        qty: qty,
        side: 'buy',
        type: 'market',
        time_in_force: 'gtc'
      });
    } catch (error) {
      console.log(`error buying ${option}: ${error} `);
    }
  });
  await UpdateProfile();
};

export const BuyFunc = onRequest({ cors: true }, async (request, response) => {
  await buy();
  response.send('buy done');
});

//scheduled function runs monday at 10:00am
export const ScheduleBuy = onSchedule(
  {
    schedule: '0 10 * * 1',
    timeZone: 'America/New_York'
  },
  async () => {
    await buy();
  }
);
