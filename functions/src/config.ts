import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import OpenAI from 'openai';
import Alpaca from '@alpacahq/alpaca-trade-api';
import dotenv from 'dotenv';

dotenv.config();

const firebase = initializeApp({
  apiKey: process.env.FB_API_KEY,
  authDomain: 'algosus.firebaseapp.com',
  databaseURL: process.env.FB_DB_URL,
  projectId: 'algosus',
  storageBucket: 'algosus.appspot.com',
  messagingSenderId: '856522899414',
  appId: '1:856522899414:web:3e09c1367f18bf0cc0ae77'
});

export const DB = getDatabase(firebase);

export const Openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export const AlpacaClient = new Alpaca({
  keyId: process.env.ALPACA_API_KEY,
  secretKey: process.env.ALPACA_SECRET_KEY,
  paper: true
});
