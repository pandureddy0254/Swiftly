import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const config = {
  port: parseInt(process.env.PORT, 10) || 8080,
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: process.env.NODE_ENV !== 'production',

  monday: {
    apiToken: process.env.MONDAY_API_TOKEN,
    apiUrl: 'https://api.monday.com/v2',
    apiVersion: '2025-04',
    signingSecret: process.env.MONDAY_SIGNING_SECRET || '',
    clientId: process.env.MONDAY_CLIENT_ID || '',
    clientSecret: process.env.MONDAY_CLIENT_SECRET || '',
    appId: process.env.MONDAY_APP_ID || '',
  },

  ai: {
    apiKey: process.env.OPENROUTER_API_KEY || '',
    model: process.env.AI_MODEL || 'anthropic/claude-sonnet-4',
    maxTokens: 4096,
  },
};

export function validateConfig() {
  if (!config.monday.apiToken) {
    throw new Error('Missing required config: MONDAY_API_TOKEN');
  }
}

export default config;
