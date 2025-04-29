import { onRequest } from 'firebase-functions/v2/https';
import { ref, set, push } from 'firebase/database';
import { Position } from './models';
import { DB, AlpacaClient } from './config';

export const UpdateProfile = async () => {
  try {
    const account = await AlpacaClient.getAccount();
    const portfolio: Position[] = await AlpacaClient.getPositions();

    await set(ref(DB, 'account/'), {
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
    const myRef = push(ref(DB, 'timeline/'));
    await set(myRef, equityData);
  } catch (error) {
    console.error('Error updating profile:', error);
    throw error;
  }
};

// force update profile during testing or something
export const UpdateFunc = onRequest({ cors: true }, async (request, response) => {
  try {
    await UpdateProfile();
  } catch (error) {
    console.error('Error updating profile:', error);
    response.status(500).send('Error updating profile');
    return;
  }
  response.send('update completed');
});
