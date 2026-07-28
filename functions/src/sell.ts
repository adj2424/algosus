import { onRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { AlpacaClient } from './config';
import { UpdateProfile } from './update';
import { requireApiKey } from './auth';

const sell = async () => {
  try {
    await AlpacaClient.closeAllPositions();
    await UpdateProfile();
  } catch (error) {
    console.error('Error running sell:', error);
    throw error;
  }
};

export const SellFunc = onRequest(async (request, response) => {
  if (!requireApiKey(request, response)) return;
  try {
    await sell();
  } catch (error) {
    console.error('Error running sell:', error);
    response.status(500).send('Error running sell');
    return;
  }
  response.send('sell done');
});

// runs friday at 3:50pm
export const ScheduleSell = onSchedule(
  {
    schedule: '50 15 * * 5',
    timeZone: 'America/New_York'
  },
  async () => {
    try {
      await sell();
    } catch (error) {
      console.error('Error running scheduled sell:', error);
    }
  }
);
