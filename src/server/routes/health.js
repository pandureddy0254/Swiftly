import { Router } from 'express';
import config from '../config/index.js';

const router = Router();

/**
 * GET /api/health
 * Health check endpoint for monitoring and Monday Code.
 */
router.get('/', (req, res) => {
  if (!config.isDev) {
    return res.json({ status: 'ok' });
  }

  res.json({
    status: 'ok',
    app: 'Swiftly',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    features: {
      mondayApi: !!config.monday.apiToken,
      aiEngine: !!config.ai.apiKey,
    },
  });
});

export default router;
