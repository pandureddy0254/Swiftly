import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import config, { validateConfig } from './config/index.js';
import { authenticateMonday, errorHandler } from './middleware/auth.js';
import reportingRoutes from './routes/reporting.js';
import aiRoutes from './routes/ai.js';
import healthRoutes from './routes/health.js';
import exportRoutes from './routes/export.js';
import actionsRoutes from './routes/actions.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Validate required config
validateConfig();

const app = express();

// --- Rate limiting ---
const apiLimiter = rateLimit({ windowMs: 60000, max: 60, message: { error: 'Too many requests' } });
const aiLimiter = rateLimit({ windowMs: 60000, max: 15, message: { error: 'Too many AI requests' } });

// --- Middleware ---
app.use(helmet({
  contentSecurityPolicy: false,
  frameguard: false,          // Allow monday.com to embed in iframe
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: false,
}));
app.use(cors({
  origin: config.isDev ? true : /\.monday\.com$/,
}));
app.use(express.json({ limit: '512kb' }));

// Request logging in dev
if (config.isDev) {
  app.use((req, _res, next) => {
    if (req.path.startsWith('/api')) {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    }
    next();
  });
}

// --- API Routes ---
app.use('/api/ai', aiLimiter);
app.use('/api', apiLimiter);
app.use('/api/health', healthRoutes);
app.use('/api', authenticateMonday(), reportingRoutes);
app.use('/api/ai', authenticateMonday(), aiRoutes);
app.use('/api/export', authenticateMonday(), exportRoutes);
app.use('/api/actions', authenticateMonday(), actionsRoutes);

// --- Static files (serve built frontend) ---
const distPath = path.resolve(__dirname, '../../dist');

// Static assets — no caching to prevent stale JS bundles
app.use(express.static(distPath, { maxAge: 0, etag: false }));
app.get('*', (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.sendFile(path.join(distPath, 'index.html'));
});

// --- Error handling ---
app.use(errorHandler);

// --- Start server ---
app.listen(config.port, () => {
  console.log(`
  ╔═══════════════════════════════════════╗
  ║   Swiftly Server Running             ║
  ║   Port: ${String(config.port).padEnd(29)}║
  ║   Mode: ${String(config.nodeEnv).padEnd(29)}║
  ║   AI:   ${String(config.ai.apiKey ? 'Enabled' : 'Disabled').padEnd(29)}║
  ╚═══════════════════════════════════════╝
  `);
});

export default app;
