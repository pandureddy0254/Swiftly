import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock config
vi.mock('../../../src/server/config/index.js', () => ({
  default: {
    monday: {
      apiToken: 'test-token',
      apiUrl: 'https://api.monday.com/v2',
      apiVersion: '2025-04',
    },
    ai: {
      apiKey: '', // Empty by default — tests override when needed
      model: 'test-model',
      maxTokens: 4096,
    },
  },
}));

const aiEngine = await import('../../../src/server/services/ai-engine.js');
const { generateStatusReport, chatWithBoardData, generateInsights } = aiEngine;

// We also need to test the non-exported helpers via the module's behavior
// autoDetectActions and parseAiResponse are internal — tested indirectly

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockFetch(responseBody, ok = true, status = 200) {
  const fn = vi.fn().mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(responseBody),
    text: () => Promise.resolve(JSON.stringify(responseBody)),
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

function makeSampleReportData(overrides = {}) {
  return {
    totalBoards: 2,
    totalItems: 10,
    totalSubitems: 3,
    completedItems: 4,
    overallProgress: 40,
    boards: [
      { name: 'Board A', progress: 50, completedItems: 3, totalItems: 6, subitems: 2 },
      { name: 'Board B', progress: 25, completedItems: 1, totalItems: 4, subitems: 1 },
    ],
    statusBreakdown: { Done: 4, 'Working on it': 4, Stuck: 2 },
    groupBreakdown: { 'Sprint 1': 6, Backlog: 4 },
    timelineData: [],
    ...overrides,
  };
}

function makeSampleBoardData() {
  return {
    summary: {
      totalBoards: 1,
      totalItems: 3,
      totalSubitems: 0,
      completedItems: 1,
      overallProgress: 33,
      statusBreakdown: { Done: 1, 'Working on it': 2 },
    },
    boards: [
      {
        boardId: '100',
        boardName: 'Project X',
        groups: [{ id: 'g1', title: 'Sprint 1' }],
        columns: [{ title: 'Status', type: 'status' }],
        totalItems: 3,
        items: [
          { id: '1', name: 'Setup CI/CD', state: 'active', status: 'Working on it', subitems: [] },
          { id: '2', name: 'Write tests', state: 'active', status: 'Working on it', subitems: [] },
          { id: '3', name: 'Deploy v1', state: 'active', status: 'Done', subitems: [] },
        ],
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ai-engine service', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // generateStatusReport
  // -------------------------------------------------------------------------
  describe('generateStatusReport()', () => {
    it('returns fallback report when no API key is configured', async () => {
      // Config has apiKey = '' — callAI returns null
      const data = makeSampleReportData();
      const result = await generateStatusReport(data);

      expect(result.model).toBe('fallback');
      expect(result.tokensUsed).toBe(0);
      expect(result.report).toContain('Project Status Report');
      expect(result.report).toContain('40%');
    });

    it('fallback report includes board progress', async () => {
      const data = makeSampleReportData();
      const result = await generateStatusReport(data);

      expect(result.report).toContain('Board A');
      expect(result.report).toContain('Board B');
    });

    it('fallback report includes status breakdown', async () => {
      const data = makeSampleReportData();
      const result = await generateStatusReport(data);

      expect(result.report).toContain('Done');
      expect(result.report).toContain('Stuck');
    });
  });

  // -------------------------------------------------------------------------
  // chatWithBoardData
  // -------------------------------------------------------------------------
  describe('chatWithBoardData()', () => {
    it('returns data-driven fallback when no API key', async () => {
      const boardData = makeSampleBoardData();
      const result = await chatWithBoardData('Give me a summary', boardData);

      expect(result.answer).toBeTruthy();
      expect(result.actions).toEqual([]);
      expect(result.tokensUsed).toBe(0);
    });

    it('returns overview fallback for summary questions', async () => {
      const boardData = makeSampleBoardData();
      const result = await chatWithBoardData('Show me a summary', boardData);

      expect(result.answer).toContain('Summary');
      expect(result.answer).toContain('Project X');
    });

    it('returns item list fallback for "all items" questions', async () => {
      const boardData = makeSampleBoardData();
      const result = await chatWithBoardData('List all items', boardData);

      expect(result.answer).toContain('All Items');
      expect(result.answer).toContain('Setup CI/CD');
      expect(result.answer).toContain('Write tests');
    });

    it('returns structured response with actions when AI responds with ACTIONS block', async () => {
      // Override config to have an API key
      const configMod = await import('../../../src/server/config/index.js');
      configMod.default.ai.apiKey = 'test-key';

      const aiText = `Here is a deep dive on "Setup CI/CD":

1. **Configure pipeline** — set up build stages
2. **Add linting** — enforce code quality
3. **Add deployment** — auto-deploy on merge

<!--ACTIONS
[{"type":"create_subitems","label":"Create Subtasks","data":{"parentItemId":"1","parentItemName":"Setup CI/CD","subitems":[{"name":"Configure pipeline"},{"name":"Add linting"},{"name":"Add deployment"}]}}]
ACTIONS-->`;

      mockFetch({
        choices: [{ message: { content: aiText } }],
        model: 'test-model',
        usage: { completion_tokens: 100 },
      });

      const boardData = makeSampleBoardData();
      const result = await chatWithBoardData('Deep dive on Setup CI/CD', boardData);

      expect(result.answer).toContain('Configure pipeline');
      expect(result.actions.length).toBeGreaterThanOrEqual(1);
      expect(result.actions[0].type).toBe('create_subitems');
      expect(result.tokensUsed).toBe(100);

      // Reset
      configMod.default.ai.apiKey = '';
    });

    it('returns error message when AI call fails', async () => {
      const configMod = await import('../../../src/server/config/index.js');
      configMod.default.ai.apiKey = 'test-key';

      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

      const boardData = makeSampleBoardData();
      const result = await chatWithBoardData('Hello', boardData);

      expect(result.answer).toMatch(/error|sorry|went wrong/i);
      expect(result.actions).toEqual([]);

      configMod.default.ai.apiKey = '';
    });
  });

  // -------------------------------------------------------------------------
  // generateInsights
  // -------------------------------------------------------------------------
  describe('generateInsights()', () => {
    it('returns fallback insights when no API key', async () => {
      const data = makeSampleReportData({ overallProgress: 30 });
      const result = await generateInsights(data);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(1);
    });

    it('returns "low progress" risk for data under 50%', async () => {
      const data = makeSampleReportData({ overallProgress: 30 });
      const result = await generateInsights(data);

      const riskInsight = result.find((i) => i.type === 'risk' && i.title === 'Low overall progress');
      expect(riskInsight).toBeTruthy();
      expect(riskInsight.severity).toBe('high');
      expect(riskInsight.description).toContain('30%');
    });

    it('returns "behind schedule" risk for boards under 25% with > 5 items', async () => {
      const data = makeSampleReportData({
        overallProgress: 20,
        boards: [
          { name: 'Slow Board', progress: 10, completedItems: 1, totalItems: 10, subitems: 0 },
        ],
      });
      const result = await generateInsights(data);

      const boardRisk = result.find((i) => i.board === 'Slow Board');
      expect(boardRisk).toBeTruthy();
      expect(boardRisk.severity).toBe('high');
    });

    it('returns "on track" insight when progress is good', async () => {
      const data = makeSampleReportData({
        overallProgress: 80,
        boards: [
          { name: 'Good Board', progress: 80, completedItems: 8, totalItems: 10, subitems: 0 },
        ],
      });
      const result = await generateInsights(data);

      const onTrack = result.find((i) => i.type === 'insight' && i.title === 'Projects on track');
      expect(onTrack).toBeTruthy();
      expect(onTrack.severity).toBe('low');
    });
  });

  // -------------------------------------------------------------------------
  // autoDetectActions (tested indirectly via chatWithBoardData)
  // -------------------------------------------------------------------------
  describe('autoDetectActions (via chat)', () => {
    it('detects numbered bold items as subtasks', async () => {
      const configMod = await import('../../../src/server/config/index.js');
      configMod.default.ai.apiKey = 'test-key';

      const aiText = `Here are subtasks for "Setup CI/CD":

1. **Install dependencies** — npm install
2. **Configure Vitest** — create vitest config
3. **Write unit tests** — cover critical paths
4. **Set up GitHub Actions** — CI pipeline`;

      mockFetch({
        choices: [{ message: { content: aiText } }],
        model: 'test-model',
        usage: { completion_tokens: 50 },
      });

      const boardData = makeSampleBoardData();
      const result = await chatWithBoardData('Break down setup ci/cd into subtasks', boardData);

      const subitemAction = result.actions.find((a) => a.type === 'create_subitems');
      expect(subitemAction).toBeTruthy();
      expect(subitemAction.data.subitems.length).toBe(4);

      configMod.default.ai.apiKey = '';
    });

    it('detects table items as subtasks', async () => {
      const configMod = await import('../../../src/server/config/index.js');
      configMod.default.ai.apiKey = 'test-key';

      const aiText = `Here is the breakdown for "Write tests":

| **Subtask** | **Priority** |
|---|---|
| **Unit test services** | High |
| **Unit test routes** | Medium |
| **Integration tests** | Low |`;

      mockFetch({
        choices: [{ message: { content: aiText } }],
        model: 'test-model',
        usage: { completion_tokens: 40 },
      });

      const boardData = makeSampleBoardData();
      const result = await chatWithBoardData('Break down write tests', boardData);

      const subitemAction = result.actions.find((a) => a.type === 'create_subitems');
      expect(subitemAction).toBeTruthy();
      expect(subitemAction.data.subitems.length).toBeGreaterThanOrEqual(2);

      configMod.default.ai.apiKey = '';
    });
  });

  // -------------------------------------------------------------------------
  // parseAiResponse (tested indirectly via chatWithBoardData)
  // -------------------------------------------------------------------------
  describe('parseAiResponse (via chat)', () => {
    it('extracts ACTIONS block correctly and removes it from text', async () => {
      const configMod = await import('../../../src/server/config/index.js');
      configMod.default.ai.apiKey = 'test-key';

      const aiText = `Great analysis! Here are my findings.

Some insights about the project.

<!--ACTIONS
[{"type":"update_status","label":"Mark Done","icon":"status","data":{"boardId":"100","itemId":"3","status":"Done"}}]
ACTIONS-->`;

      mockFetch({
        choices: [{ message: { content: aiText } }],
        model: 'test-model',
        usage: { completion_tokens: 30 },
      });

      const boardData = makeSampleBoardData();
      const result = await chatWithBoardData('Update status of Deploy v1', boardData);

      // The ACTIONS block should be stripped from the answer
      expect(result.answer).not.toContain('<!--ACTIONS');
      expect(result.answer).not.toContain('ACTIONS-->');
      expect(result.answer).toContain('Great analysis');

      // Actions should be parsed
      const statusAction = result.actions.find((a) => a.type === 'update_status');
      expect(statusAction).toBeTruthy();
      expect(statusAction.data.itemId).toBe('3');

      configMod.default.ai.apiKey = '';
    });
  });
});
