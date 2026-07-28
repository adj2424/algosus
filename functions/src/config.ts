import { initializeApp } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';
import { GoogleGenAI } from '@google/genai';
import Alpaca from '@alpacahq/alpaca-trade-api';
import dotenv from 'dotenv';

dotenv.config();

const requiredEnv = ['GEMINI_API_KEY', 'ALPACA_API_KEY', 'ALPACA_SECRET_KEY', 'FB_DB_URL'];
const missing = requiredEnv.filter(name => !process.env[name]);
if (missing.length > 0) {
  throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}

const firebase = initializeApp({
  databaseURL: process.env.FB_DB_URL
});

export const DB = getDatabase(firebase);

export const GeminiClient = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

export const AlpacaClient = new Alpaca({
  keyId: process.env.ALPACA_API_KEY,
  secretKey: process.env.ALPACA_SECRET_KEY,
  paper: true
});
