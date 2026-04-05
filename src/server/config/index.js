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
  if (!config.monday.signingSecret) {
    // In production, signing secret is required to verify JWT session tokens.
    // In dev, warn but allow startup with just an API token for local testing.
    if (!config.isDev) {
      throw new Error('Missing required config: MONDAY_SIGNING_SECRET (needed to verify marketplace session tokens)');
    }
    console.warn('[Swiftly] Warning: MONDAY_SIGNING_SECRET not set. JWT verification will fail; falling back to MONDAY_API_TOKEN for dev.');
  }
  if (!config.monday.signingSecret && !config.monday.apiToken) {
    throw new Error('Missing required config: either MONDAY_SIGNING_SECRET or MONDAY_API_TOKEN must be set');
  }
}

export default config;
