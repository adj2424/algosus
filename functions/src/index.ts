import { onRequest } from 'firebase-functions/v2/https';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, child, push, get } from 'firebase/database';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import OpenAI from 'openai';
import Alpaca from '@alpacahq/alpaca-trade-api';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

type position = {
  asset_class: string;
  asset_id: string;
  asset_marginable: boolean;
  avg_entry_price: number;
  change_today: number;
  cost_basis: number;
  current_price: number;
  exchange: string;
  lastday_price: number;
  market_value: number;
  maintenance_margin: number;
  qty: number;
  qty_available: number;
  side: string;
  symbol: string;
  unrealized_intraday_pl: number;
  unrealized_intraday_plpc: number;
  unrealized_pl: number;
  unrealized_plpc: number;
};

type data = {
  account: {
    current_equity: number;
    initial_equity: number;
    last_equity: number;
    positions: position[];
  };

  timeline: {
    [key: string]: {
      equity: number;
      date: string;
    };
  };
};

const firebase = initializeApp({
  apiKey: process.env.FB_API_KEY,
  authDomain: 'algosus.firebaseapp.com',
  databaseURL: process.env.FB_DB_URL,
  projectId: 'algosus',
  storageBucket: 'algosus.appspot.com',
  messagingSenderId: '856522899414',
  appId: '1:856522899414:web:3e09c1367f18bf0cc0ae77'
});
const db = getDatabase(firebase);
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});
const alpaca = new Alpaca({
  keyId: process.env.ALPACA_API_KEY,
  secretKey: process.env.ALPACA_SECRET_KEY,
  paper: true
});

const getTickerSymbols = (text: string) => {
  const array = text.replace(/[\[\]\s]/g, '').split(',');
  return array.length > 5 ? array.slice(-5) : array;
};

// returns in days
const getDateDifference = (date1: Date, date2: Date) => {
  return Math.abs((date1.valueOf() - date2.valueOf()) / (1000 * 60 * 60 * 24));
};

const updateProfile = async () => {
  try {
    const account = await alpaca.getAccount();
    const portfolio: position[] = await alpaca.getPositions();

    await set(ref(db, 'account/'), {
      current_equity: Number(account.equity),
      last_equity: Number(account.last_equity),
      positions: portfolio,
      initial_equity: 3000
    });

    // update timeline with new forced update
    const equityData = {
      equity: Number(account.equity),
      date: new Date().toString()
    };
    const myRef = push(ref(db, 'timeline/'));
    await set(myRef, equityData);
  } catch (error) {
    console.error('Error updating profile:', error);
    throw error;
  }
};

const buy = async () => {
  const account = await alpaca.getAccount();
  if (account.trading_blocked) {
    console.error('Account is restricted from trading');
    return;
  }

  let options: string[] = [];

  try {
    // ask openai which stocks to buy
    const res = await openai.responses.create({
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
      await alpaca.createOrder({
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
  await updateProfile();
};

const sell = async () => {
  await fetch(`https://paper-api.alpaca.markets/v2/positions`, {
    method: 'DELETE',
    headers: {
      Accept: 'application/json',
      'APCA-API-KEY-ID': process.env.ALPACA_API_KEY!,
      'APCA-API-SECRET-KEY': process.env.ALPACA_SECRET_KEY!
    }
  });
  await updateProfile();
};

// force update profile during testing or something
export const update = onRequest(async (request, response) => {
  cors()(request, response, async () => {
    try {
      await updateProfile();
    } catch (error) {
      console.error('Error updating profile:', error);
      response.status(500).send('Error updating profile');
      return;
    }
    response.send('update completed');
  });
});

export const getData = onRequest(async (request, response) => {
  cors()(request, response, async () => {
    // return all data
    const snapshot = await get(child(ref(db), '/'));
    if (!snapshot.exists()) {
      response.send('No data available');
      return;
    }

    const data: data = snapshot.val();
    const latestDate = Object.values(data.timeline).slice(-1)[0].date;
    const now = new Date();
    // check if update is needed
    // update if 18 hours have passed
    if (getDateDifference(now, new Date(latestDate)) >= 0.75) {
      try {
        await updateProfile();
      } catch (error) {
        console.error('Error updating profile:', error);
        response.status(500).send('Error updating profile');
        return;
      }
    }
    // if in trading hours 9:30-4:00 and 5 mins have passed
    else if (
      now.getDay() !== 0 &&
      now.getDay() !== 6 &&
      now.getHours() >= 9 &&
      now.getHours() <= 16 &&
      getDateDifference(now, new Date(latestDate)) >= 0.00347222
    ) {
      console.log('updating profile...');
      try {
        await updateProfile();
      } catch (error) {
        console.error('Error updating profile:', error);
        response.status(500).send('Error updating profile');
        return;
      }
    }
    response.send(snapshot.val());
  });
});

export const sellFunc = onRequest(async (request, response) => {
  cors()(request, response, async () => {
    await sell();
    response.send('sell done');
  });
});

export const buyFunc = onRequest(async (request, response) => {
  cors()(request, response, async () => {
    await buy();
    response.send('buy done');
  });
});

//runs friday at 3:50pm
exports.sell = onSchedule(
  {
    schedule: '50 15 * * 5',
    timeZone: 'America/New_York'
  },
  async () => {
    await sell();
  }
);

//scheduled function runs monday at 10:00am

exports.buy = onSchedule(
  {
    schedule: '0 10 * * 1',
    timeZone: 'America/New_York'
  },
  async () => {
    await buy();
  }
);

