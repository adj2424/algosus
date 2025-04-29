import { onRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { UpdateProfile } from './update';
import dotenv from 'dotenv';

dotenv.config();

const sell = async () => {
  await fetch(`https://paper-api.alpaca.markets/v2/positions`, {
    method: 'DELETE',
    headers: {
      Accept: 'application/json',
      'APCA-API-KEY-ID': process.env.ALPACA_API_KEY!,
      'APCA-API-SECRET-KEY': process.env.ALPACA_SECRET_KEY!
    }
  });
  await UpdateProfile();
};

export const SellFunc = onRequest({ cors: true }, async (request, response) => {
  await sell();
  response.send('sell done');
});

//runs friday at 3:50pm
export const ScheduleSell = onSchedule(
  {
    schedule: '50 15 * * 5',
    timeZone: 'America/New_York'
  },
  async () => {
    await sell();
  }
);
