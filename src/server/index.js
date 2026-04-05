import express from 'express';
import cors from 'cors';
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

// --- Middleware ---
app.use(cors());
app.use(express.json({ limit: '10mb' }));

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
app.use('/api/health', healthRoutes);
app.use('/api', authenticateMonday, reportingRoutes);
app.use('/api/ai', authenticateMonday, aiRoutes);
app.use('/api/export', authenticateMonday, exportRoutes);
app.use('/api/actions', authenticateMonday, actionsRoutes);

// --- Static files (serve built frontend) ---
const distPath = path.resolve(__dirname, '../../dist');
app.use(express.static(distPath));
app.get('*', (_req, res) => {
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
