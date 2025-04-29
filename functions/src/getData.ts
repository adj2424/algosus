import { onRequest } from 'firebase-functions/v2/https';
import { ref, child, get } from 'firebase/database';
import { Response } from './models';
import { DB } from './config';
import { UpdateProfile } from './update';

// returns in days
const getDateDifference = (date1: Date, date2: Date) => {
  return Math.abs((date1.valueOf() - date2.valueOf()) / (1000 * 60 * 60 * 24));
};

export const GetDataFunc = onRequest({ cors: true }, async (request, response) => {
  // return all data
  const snapshot = await get(child(ref(DB), '/'));
  if (!snapshot.exists()) {
    response.send('No data available');
    return;
  }

  const data: Response = snapshot.val();
  const latestDate = Object.values(data.timeline).slice(-1)[0].date;
  const now = new Date();
  // check if update is needed
  // update if 18 hours have passed
  if (getDateDifference(now, new Date(latestDate)) >= 0.75) {
    try {
      await UpdateProfile();
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
      await UpdateProfile();
    } catch (error) {
      console.error('Error updating profile:', error);
      response.status(500).send('Error updating profile');
      return;
    }
  }
  response.send(snapshot.val());
});
