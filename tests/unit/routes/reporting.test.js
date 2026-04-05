import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';

// ---------------------------------------------------------------------------
// Mock service modules BEFORE importing the router
// ---------------------------------------------------------------------------

const mockGetCrossBoardItems = vi.fn();
const mockAggregateBoardData = vi.fn();
const mockGenerateStatusReport = vi.fn();
const mockGenerateInsights = vi.fn();

vi.mock('../../../src/server/services/monday-api.js', () => ({
  default: {
    getBoards: vi.fn(),
    getBoard: vi.fn(),
    getBoardItems: vi.fn(),
    getCrossBoardItems: mockGetCrossBoardItems,
    aggregateBoardData: mockAggregateBoardData,
  },
}));

vi.mock('../../../src/server/services/ai-engine.js', () => ({
  default: {
    generateStatusReport: mockGenerateStatusReport,
    generateInsights: mockGenerateInsights,
  },
}));

vi.mock('../../../src/server/config/index.js', () => ({
  default: {
    monday: { apiToken: 'test', apiUrl: 'https://api.monday.com/v2', apiVersion: '2025-04' },
    ai: { apiKey: '', model: 'test' },
  },
}));

// Now import the router
const { default: reportingRouter } = await import('../../../src/server/routes/reporting.js');

// ---------------------------------------------------------------------------
// Test app setup
// ---------------------------------------------------------------------------

function createApp() {
  const app = express();
  app.use(express.json());
  // Fake auth middleware: attach mondayToken
  app.use((req, _res, next) => {
    req.mondayToken = 'test-token';
    next();
  });
  app.use('/api', reportingRouter);
  // Error handler
  app.use((err, _req, res, _next) => {
    res.status(500).json({ error: err.message });
  });
  return app;
}

/** Lightweight supertest replacement using fetch against an ephemeral server */
async function request(app, method, path, body) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, async () => {
      try {
        const { port } = server.address();
        const url = `http://127.0.0.1:${port}${path}`;
        const opts = { method, headers: { 'Content-Type': 'application/json' } };
        if (body) opts.body = JSON.stringify(body);
        const res = await globalThis.fetch(url, opts);
        const json = await res.json().catch(() => null);
        resolve({ status: res.status, body: json });
      } catch (err) {
        reject(err);
      } finally {
        server.close();
      }
    });
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/reports/generate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns report with data and insights', async () => {
    const crossBoardData = [
      { boardId: '1', boardName: 'A', items: [], itemCount: 2, completedCount: 1 },
    ];
    const aggregated = {
      totalBoards: 1, totalItems: 2, completedItems: 1, overallProgress: 50,
      boards: [{ id: '1', name: 'A', progress: 50, completedItems: 1, totalItems: 2, subitems: 0 }],
      statusBreakdown: {}, groupBreakdown: {}, timelineData: [],
    };

    mockGetCrossBoardItems.mockResolvedValue(crossBoardData);
    mockAggregateBoardData.mockReturnValue(aggregated);
    mockGenerateStatusReport.mockResolvedValue({ report: '# Report', model: 'test', tokensUsed: 0 });
    mockGenerateInsights.mockResolvedValue([{ type: 'insight', title: 'On track', severity: 'low', board: null }]);

    const app = createApp();
    const res = await request(app, 'POST', '/api/reports/generate', { boardIds: ['1'] });

    expect(res.status).toBe(200);
    expect(res.body.report).toEqual({ report: '# Report', model: 'test', tokensUsed: 0 });
    expect(res.body.data).toEqual(aggregated);
    expect(res.body.insights).toHaveLength(1);
    expect(res.body.generatedAt).toBeTruthy();
  });

  it('returns 400 for missing boardIds', async () => {
    const app = createApp();
    const res = await request(app, 'POST', '/api/reports/generate', {});

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('boardIds');
  });

  it('returns 400 for empty boardIds array', async () => {
    const app = createApp();
    const res = await request(app, 'POST', '/api/reports/generate', { boardIds: [] });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('boardIds');
  });

  it('returns 400 for non-array boardIds', async () => {
    const app = createApp();
    const res = await request(app, 'POST', '/api/reports/generate', { boardIds: '123' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('boardIds');
  });

  it('returns 400 when more than 20 boards requested', async () => {
    const ids = Array.from({ length: 21 }, (_, i) => String(i));
    const app = createApp();
    const res = await request(app, 'POST', '/api/reports/generate', { boardIds: ids });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Maximum 20');
  });
});
