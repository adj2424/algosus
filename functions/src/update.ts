import { onRequest } from "firebase-functions/v2/https";
import { Position } from "./models";
import { DB, AlpacaClient } from "./config";
import { requireApiKey } from "./auth";

// starting equity when the bot was initiated (Feb 2023)
const INITIAL_EQUITY = 3000;

export const UpdateProfile = async () => {
  try {
    const account = await AlpacaClient.getAccount();
    const portfolio: Position[] = await AlpacaClient.getPositions();

    await DB.ref("account").set({
      current_equity: Number(account.equity),
      last_equity: Number(account.last_equity),
      positions: portfolio,
      initial_equity: INITIAL_EQUITY,
    });

    // update timeline with new forced update
    await DB.ref("timeline").push({
      equity: Number(account.equity),
      date: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    throw error;
  }
};

// force update profile during testing or something
export const UpdateFunc = onRequest(async (request, response) => {
  if (!requireApiKey(request, response)) return;
  try {
    await UpdateProfile();
  } catch (error) {
    console.error("Error updating profile:", error);
    response.status(500).send("Error updating profile");
    return;
  }
  response.send("update completed");
});
