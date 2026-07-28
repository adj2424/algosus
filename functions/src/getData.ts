import { onRequest } from "firebase-functions/v2/https";
import { Response } from "./models";
import { DB } from "./config";
import { UpdateProfile } from "./update";

// returns in days
const getDateDifference = (date1: Date, date2: Date) => {
  return Math.abs((date1.valueOf() - date2.valueOf()) / (1000 * 60 * 60 * 24));
};

// Cloud Functions servers run in UTC; convert before comparing against
// New York market hours.
const getEasternTime = (date: Date) => {
  return new Date(date.toLocaleString("en-US", { timeZone: "America/New_York" }));
};

export const GetDataFunc = onRequest({ cors: true }, async (request, response) => {
  // return all data
  let snapshot;
  try {
    snapshot = await DB.ref("/").get();
  } catch (error) {
    console.error("Error reading database:", error);
    response.status(500).send("Error reading data");
    return;
  }
  if (!snapshot.exists()) {
    response.send("No data available");
    return;
  }

  const data: Response = snapshot.val();
  const timelineEntries = Object.values(data.timeline ?? {});
  const latestEntry = timelineEntries[timelineEntries.length - 1];

  if (!latestEntry) {
    try {
      await UpdateProfile();
    } catch (error) {
      console.error("Error updating profile:", error);
      response.status(500).send("Error updating profile");
      return;
    }
    const refreshedSnapshot = await DB.ref("/").get();
    response.send(refreshedSnapshot.val());
    return;
  }

  const latestDate = latestEntry.date;
  const now = new Date();
  const easternNow = getEasternTime(now);
  // check if update is needed
  // update if 18 hours have passed
  if (getDateDifference(now, new Date(latestDate)) >= 0.75) {
    try {
      await UpdateProfile();
    } catch (error) {
      console.error("Error updating profile:", error);
      response.status(500).send("Error updating profile");
      return;
    }
  // if in trading hours 9:30-4:00 ET and 5 mins have passed
  } else if (
    easternNow.getDay() !== 0 &&
    easternNow.getDay() !== 6 &&
    easternNow.getHours() >= 9 &&
    easternNow.getHours() <= 16 &&
    getDateDifference(now, new Date(latestDate)) >= 0.00347222
  ) {
    console.log("updating profile...");
    try {
      await UpdateProfile();
    } catch (error) {
      console.error("Error updating profile:", error);
      response.status(500).send("Error updating profile");
      return;
    }
  }
  response.send(snapshot.val());
});
