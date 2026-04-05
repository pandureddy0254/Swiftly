import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the config module before importing the service
vi.mock('../../../src/server/config/index.js', () => ({
  default: {
    monday: {
      apiToken: 'test-token-123',
      apiUrl: 'https://api.monday.com/v2',
      apiVersion: '2025-04',
    },
    ai: {
      apiKey: '',
      model: 'test-model',
    },
  },
}));

// Import after mock
const mondayApi = await import('../../../src/server/services/monday-api.js');
const {
  getBoards,
  getBoardItems,
  getCrossBoardItems,
  aggregateBoardData,
  getBoard,
  getMe,
} = mondayApi;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockFetch(responseData, ok = true, status = 200) {
  const fn = vi.fn().mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(responseData),
    text: () => Promise.resolve(JSON.stringify(responseData)),
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('monday-api service', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // getBoards
  // -------------------------------------------------------------------------
  describe('getBoards()', () => {
    it('returns boards array from API response', async () => {
      const boards = [
        { id: '1', name: 'Board A', items_count: 5 },
        { id: '2', name: 'Board B', items_count: 10 },
      ];
      mockFetch({ data: { boards } });

      const result = await getBoards('tok');
      expect(result).toEqual(boards);
      expect(result).toHaveLength(2);
    });

    it('handles empty boards response', async () => {
      mockFetch({ data: { boards: [] } });

      const result = await getBoards('tok');
      expect(result).toEqual([]);
    });

    it('throws on API error in response body', async () => {
      mockFetch({ errors: [{ message: 'Unauthorized' }] });

      await expect(getBoards('tok')).rejects.toThrow('Monday API error: Unauthorized');
    });

    it('throws on HTTP error', async () => {
      mockFetch({}, false, 500);

      await expect(getBoards('tok')).rejects.toThrow('Monday API HTTP 500');
    });
  });

  // -------------------------------------------------------------------------
  // getBoardItems
  // -------------------------------------------------------------------------
  describe('getBoardItems()', () => {
    it('returns items with pagination info', async () => {
      const items = [
        { id: '10', name: 'Item 1', state: 'active', column_values: [] },
        { id: '11', name: 'Item 2', state: 'active', column_values: [] },
      ];
      mockFetch({
        data: {
          boards: [{ items_page: { cursor: 'next-page', items } }],
        },
      });

      const result = await getBoardItems('tok', '1');
      expect(result.items).toEqual(items);
      expect(result.cursor).toBe('next-page');
      expect(result.hasMore).toBe(true);
    });

    it('returns hasMore false when no cursor', async () => {
      mockFetch({
        data: {
          boards: [{ items_page: { cursor: null, items: [{ id: '10', name: 'Item 1' }] } }],
        },
      });

      const result = await getBoardItems('tok', '1');
      expect(result.hasMore).toBe(false);
      expect(result.cursor).toBeNull();
    });

    it('handles empty board (no items)', async () => {
      mockFetch({
        data: {
          boards: [{ items_page: { cursor: null, items: [] } }],
        },
      });

      const result = await getBoardItems('tok', '1');
      expect(result.items).toEqual([]);
      expect(result.hasMore).toBe(false);
    });

    it('handles missing boards array gracefully', async () => {
      mockFetch({ data: { boards: [] } });

      const result = await getBoardItems('tok', '999');
      expect(result.items).toEqual([]);
      expect(result.hasMore).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // getCrossBoardItems
  // -------------------------------------------------------------------------
  describe('getCrossBoardItems()', () => {
    it('aggregates items from multiple boards', async () => {
      const fetchFn = vi.fn();
      vi.stubGlobal('fetch', fetchFn);

      // Board 1 - getBoard call
      fetchFn.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: {
            boards: [{
              id: '1', name: 'Board A',
              columns: [{ id: 'status', title: 'Status', type: 'status' }],
              groups: [{ id: 'g1', title: 'Group 1' }],
            }],
          },
        }),
      });
      // Board 1 - getAllBoardItems call
      fetchFn.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: {
            boards: [{
              items_page: {
                cursor: null,
                items: [
                  { id: '10', name: 'Task A', state: 'active', column_values: [], subitems: [] },
                ],
              },
            }],
          },
        }),
      });
      // Board 2 - getBoard call
      fetchFn.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: {
            boards: [{
              id: '2', name: 'Board B',
              columns: [{ id: 'status', title: 'Status', type: 'status' }],
              groups: [{ id: 'g2', title: 'Group 2' }],
            }],
          },
        }),
      });
      // Board 2 - getAllBoardItems call
      fetchFn.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: {
            boards: [{
              items_page: {
                cursor: null,
                items: [
                  {
                    id: '20', name: 'Task B', state: 'active',
                    column_values: [{ type: 'status', text: 'Done', id: 'status' }],
                    subitems: [],
                  },
                ],
              },
            }],
          },
        }),
      });

      const result = await getCrossBoardItems('tok', ['1', '2']);
      expect(result).toHaveLength(2);
      expect(result[0].boardName).toBe('Board A');
      expect(result[0].itemCount).toBe(1);
      expect(result[1].boardName).toBe('Board B');
      expect(result[1].completedCount).toBe(1);
    });
  });

  // -------------------------------------------------------------------------
  // aggregateBoardData
  // -------------------------------------------------------------------------
  describe('aggregateBoardData()', () => {
    const sampleCrossBoardData = [
      {
        boardId: '1',
        boardName: 'Board A',
        columns: [],
        groups: [],
        items: [
          {
            id: '10', name: 'Item 1', state: 'active',
            column_values: [
              { type: 'status', text: 'Working on it', id: 's' },
            ],
            group: { id: 'g1', title: 'Sprint 1' },
            subitems: [{ id: 's1', name: 'Sub 1' }],
          },
          {
            id: '11', name: 'Item 2', state: 'active',
            column_values: [
              { type: 'status', text: 'Done', id: 's' },
            ],
            group: { id: 'g1', title: 'Sprint 1' },
            subitems: [],
          },
        ],
        itemCount: 2,
        completedCount: 1,
      },
      {
        boardId: '2',
        boardName: 'Board B',
        columns: [],
        groups: [],
        items: [
          {
            id: '20', name: 'Item 3', state: 'active',
            column_values: [
              { type: 'status', text: 'Stuck', id: 's' },
              { type: 'date', text: '2025-01-15', id: 'd' },
            ],
            group: { id: 'g2', title: 'Backlog' },
            subitems: [],
          },
        ],
        itemCount: 1,
        completedCount: 0,
      },
    ];

    it('calculates correct totals', () => {
      const report = aggregateBoardData(sampleCrossBoardData);
      expect(report.totalBoards).toBe(2);
      expect(report.totalItems).toBe(3);
      expect(report.totalSubitems).toBe(1);
      expect(report.completedItems).toBe(1);
    });

    it('calculates progress percentage', () => {
      const report = aggregateBoardData(sampleCrossBoardData);
      // 1 completed / 3 total = 33%
      expect(report.overallProgress).toBe(33);
    });

    it('produces correct status breakdown', () => {
      const report = aggregateBoardData(sampleCrossBoardData);
      expect(report.statusBreakdown).toEqual({
        'Working on it': 1,
        'Done': 1,
        'Stuck': 1,
      });
    });

    it('produces correct group breakdown', () => {
      const report = aggregateBoardData(sampleCrossBoardData);
      expect(report.groupBreakdown).toEqual({
        'Sprint 1': 2,
        'Backlog': 1,
      });
    });

    it('populates timeline data from date columns', () => {
      const report = aggregateBoardData(sampleCrossBoardData);
      expect(report.timelineData).toHaveLength(1);
      expect(report.timelineData[0].date).toBe('2025-01-15');
      expect(report.timelineData[0].board).toBe('Board B');
    });

    it('handles 0 items (empty boards)', () => {
      const report = aggregateBoardData([]);
      expect(report.totalBoards).toBe(0);
      expect(report.totalItems).toBe(0);
      expect(report.overallProgress).toBe(0);
    });

    it('handles board with 0 items', () => {
      const report = aggregateBoardData([
        { boardId: '1', boardName: 'Empty', columns: [], groups: [], items: [], itemCount: 0, completedCount: 0 },
      ]);
      expect(report.totalBoards).toBe(1);
      expect(report.boards[0].progress).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // Edge cases
  // -------------------------------------------------------------------------
  describe('edge cases', () => {
    it('handles null column_values in items', () => {
      const data = [
        {
          boardId: '1', boardName: 'Test', columns: [], groups: [],
          items: [
            { id: '1', name: 'No cols', state: 'active', column_values: null, subitems: [] },
          ],
          itemCount: 1, completedCount: 0,
        },
      ];

      // aggregateBoardData uses ?. access so null column_values should not throw
      const report = aggregateBoardData(data);
      expect(report.totalItems).toBe(1);
      expect(report.statusBreakdown).toEqual({});
    });

    it('handles items with missing group', () => {
      const data = [
        {
          boardId: '1', boardName: 'Test', columns: [], groups: [],
          items: [
            { id: '1', name: 'No group', state: 'active', column_values: [], group: null, subitems: [] },
          ],
          itemCount: 1, completedCount: 0,
        },
      ];
      const report = aggregateBoardData(data);
      expect(report.groupBreakdown).toEqual({ 'No Group': 1 });
    });

    it('handles items with empty subitems', () => {
      const data = [
        {
          boardId: '1', boardName: 'Test', columns: [], groups: [],
          items: [
            { id: '1', name: 'No subs', state: 'active', column_values: [], subitems: undefined },
          ],
          itemCount: 1, completedCount: 0,
        },
      ];
      const report = aggregateBoardData(data);
      expect(report.totalSubitems).toBe(0);
    });
  });
});
