import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';

// ---------------------------------------------------------------------------
// Mock service module
// ---------------------------------------------------------------------------

const mockCreateItem = vi.fn();
const mockCreateSubitems = vi.fn();
const mockUpdateItem = vi.fn();

vi.mock('../../../src/server/services/monday-actions.js', () => ({
  default: {
    createItem: mockCreateItem,
    createSubitems: mockCreateSubitems,
    updateItem: mockUpdateItem,
    updateMultipleItems: vi.fn(),
    moveItemToGroup: vi.fn(),
    deleteItem: vi.fn(),
    createGroup: vi.fn(),
    getUsers: vi.fn(),
    archiveItem: vi.fn(),
  },
}));

vi.mock('../../../src/server/config/index.js', () => ({
  default: {
    monday: { apiToken: 'test', apiUrl: 'https://api.monday.com/v2', apiVersion: '2025-04' },
    ai: { apiKey: '', model: 'test' },
  },
}));

const { default: actionsRouter } = await import('../../../src/server/routes/actions.js');

// ---------------------------------------------------------------------------
// Test app setup
// ---------------------------------------------------------------------------

function createApp() {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.mondayToken = 'test-token';
    next();
  });
  app.use('/api/actions', actionsRouter);
  app.use((err, _req, res, _next) => {
    res.status(500).json({ error: err.message });
  });
  return app;
}

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

describe('Actions routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // POST /api/actions/create-subitems
  // -------------------------------------------------------------------------
  describe('POST /api/actions/create-subitems', () => {
    it('returns 400 when parentItemId is missing', async () => {
      const app = createApp();
      const res = await request(app, 'POST', '/api/actions/create-subitems', {
        subitems: [{ name: 'Sub 1' }],
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('parentItemId');
    });

    it('returns 400 when subitems is missing', async () => {
      const app = createApp();
      const res = await request(app, 'POST', '/api/actions/create-subitems', {
        parentItemId: '10',
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('subitems');
    });

    it('returns 400 when subitems is empty array', async () => {
      const app = createApp();
      const res = await request(app, 'POST', '/api/actions/create-subitems', {
        parentItemId: '10',
        subitems: [],
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('subitems');
    });

    it('returns 400 when subitem lacks a name', async () => {
      const app = createApp();
      const res = await request(app, 'POST', '/api/actions/create-subitems', {
        parentItemId: '10',
        subitems: [{ name: 'Valid' }, { notName: 'oops' }],
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('name');
    });

    it('succeeds with valid payload', async () => {
      mockCreateSubitems.mockResolvedValue({
        created: [{ id: 's1', name: 'Sub 1' }],
        errors: [],
        totalRequested: 1,
        totalCreated: 1,
      });

      const app = createApp();
      const res = await request(app, 'POST', '/api/actions/create-subitems', {
        parentItemId: '10',
        subitems: [{ name: 'Sub 1' }],
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.totalCreated).toBe(1);
    });
  });

  // -------------------------------------------------------------------------
  // POST /api/actions/create-item
  // -------------------------------------------------------------------------
  describe('POST /api/actions/create-item', () => {
    it('returns 400 when boardId is missing', async () => {
      const app = createApp();
      const res = await request(app, 'POST', '/api/actions/create-item', {
        itemName: 'Task',
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('boardId');
    });

    it('returns 400 when itemName is missing', async () => {
      const app = createApp();
      const res = await request(app, 'POST', '/api/actions/create-item', {
        boardId: '100',
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('itemName');
    });

    it('returns 400 when itemName is not a string', async () => {
      const app = createApp();
      const res = await request(app, 'POST', '/api/actions/create-item', {
        boardId: '100',
        itemName: 123,
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('itemName');
    });

    it('succeeds with valid boardId and itemName', async () => {
      mockCreateItem.mockResolvedValue({ id: '999', name: 'New Task' });

      const app = createApp();
      const res = await request(app, 'POST', '/api/actions/create-item', {
        boardId: '100',
        itemName: 'New Task',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.item).toEqual({ id: '999', name: 'New Task' });
    });
  });
});
