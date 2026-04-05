import crypto from 'crypto';
import config from '../config/index.js';

/**
 * Middleware to authenticate requests from monday.com.
 * In development mode, falls back to the configured API token.
 * In production, validates the monday.com session token.
 */
export function authenticateMonday(req, res, next) {
  // Development mode: use configured token
  if (config.isDev) {
    req.mondayToken = config.monday.apiToken;
    return next();
  }

  // Production: extract token from Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Missing authorization header' });
  }

  req.mondayToken = authHeader.replace('Bearer ', '');
  next();
}

/**
 * Verify monday.com webhook signatures.
 */
export function verifyWebhookSignature(req, res, next) {
  if (config.isDev) return next();

  const signature = req.headers['x-monday-signature'];
  if (!signature || !config.monday.signingSecret) {
    return res.status(401).json({ error: 'Missing webhook signature' });
  }

  const hmac = crypto.createHmac('sha256', config.monday.signingSecret);
  hmac.update(JSON.stringify(req.body));
  const expected = hmac.digest('hex');

  if (signature !== expected) {
    return res.status(401).json({ error: 'Invalid webhook signature' });
  }

  next();
}

/**
 * Global error handler middleware.
 */
export function errorHandler(err, req, res, _next) {
  console.error('[Swiftly Error]', err.message, err.stack);

  if (err.message?.includes('Monday API')) {
    return res.status(502).json({
      error: 'Monday.com API error',
      message: config.isDev ? err.message : 'Failed to communicate with monday.com',
    });
  }

  if (err.message?.includes('Anthropic') || err.message?.includes('Claude')) {
    return res.status(502).json({
      error: 'AI service error',
      message: config.isDev ? err.message : 'AI service temporarily unavailable',
    });
  }

  res.status(500).json({
    error: 'Internal server error',
    message: config.isDev ? err.message : 'Something went wrong',
  });
}
