import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import config from '../config/index.js';

/**
 * Authenticate Monday.com session tokens for marketplace users.
 * In production: verifies JWT and extracts shortLivedToken.
 * In dev/standalone: falls back to env MONDAY_API_TOKEN for local testing.
 */
export function authenticateMonday() {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    // Dev/standalone mode fallback
    if (!token || token === 'standalone') {
      if (config.isDev && config.monday.apiToken) {
        req.mondayToken = config.monday.apiToken;
        req.isStandalone = true;
        return next();
      }
      return res.status(401).json({ error: 'Authentication required. Please open Swiftly inside monday.com.' });
    }

    // Guard against missing signing secret
    if (!config.monday.signingSecret) {
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Verify Monday.com JWT session token
    try {
      const decoded = jwt.verify(token, config.monday.signingSecret);
      // The JWT payload contains shortLivedToken for API access
      req.mondayToken = decoded.shortLivedToken || decoded.dat?.shortLivedToken || token;
      req.mondayUserId = decoded.userId || decoded.dat?.user_id;
      req.mondayAccountId = decoded.accountId || decoded.dat?.account_id;
      req.isStandalone = false;
      next();
    } catch (err) {
      // If JWT verification fails, try using the token directly (for API tokens in testing)
      if (config.isDev && config.monday.apiToken) {
        req.mondayToken = config.monday.apiToken;
        req.isStandalone = true;
        return next();
      }
      return res.status(401).json({ error: 'Invalid or expired session token', code: 'TOKEN_EXPIRED' });
    }
  };
}

/**
 * Verify webhook signatures from Monday.com
 */
export function verifyWebhookSignature() {
  return (req, res, next) => {
    const signature = req.headers['x-monday-signature'];
    if (!signature) {
      return res.status(401).json({ error: 'Missing webhook signature' });
    }
    // Verify using signing secret (timing-safe comparison)
    const sig = Buffer.from(signature, 'base64');
    const expected = crypto.createHmac('sha256', config.monday.signingSecret)
      .update(JSON.stringify(req.body))
      .digest();
    if (!crypto.timingSafeEqual(sig, expected)) {
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }
    next();
  };
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
