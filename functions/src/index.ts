import * as functions from 'firebase-functions';
import { Configuration, OpenAIApi } from 'openai';

require('dotenv').config();

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY
});
const openai = new OpenAIApi(configuration);

exports.helloWorld = functions.https.onRequest(async (request, response) => {
  try {
    const res = await openai.createCompletion({
      model: 'text-davinci-003',
      prompt: 'What is your top 10 favorite candies?',
      temperature: 0.5,
      max_tokens: 256,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0
    });
    response.send(res.data);
  } catch (e) {
    console.log(e);
  }
});
