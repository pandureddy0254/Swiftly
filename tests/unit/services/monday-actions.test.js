import { describe, it, expect, vi, afterEach } from 'vitest';

// Mock the config module
vi.mock('../../../src/server/config/index.js', () => ({
  default: {
    monday: {
      apiToken: 'test-token-123',
      apiUrl: 'https://api.monday.com/v2',
      apiVersion: '2025-04',
    },
    ai: { apiKey: '', model: 'test' },
  },
}));

const {
  createItem,
  createSubitems,
  updateItem,
  updateMultipleItems,
  moveItemToGroup,
  deleteItem,
  createGroup,
} = await import('../../../src/server/services/monday-actions.js');

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

describe('monday-actions service', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // createItem
  // -------------------------------------------------------------------------
  describe('createItem()', () => {
    it('sends correct GraphQL mutation and returns created item', async () => {
      const fetchFn = mockFetch({
        data: { create_item: { id: '999', name: 'New Task' } },
      });

      const result = await createItem('tok', '100', 'New Task', {}, null);

      expect(result).toEqual({ id: '999', name: 'New Task' });

      // Verify the fetch was called with correct parameters
      const callBody = JSON.parse(fetchFn.mock.calls[0][1].body);
      expect(callBody.query).toContain('create_item');
      expect(callBody.variables.boardId).toBe('100');
      expect(callBody.variables.itemName).toBe('New Task');
    });

    it('sends groupId when provided', async () => {
      const fetchFn = mockFetch({
        data: { create_item: { id: '999', name: 'Grouped Task' } },
      });

      await createItem('tok', '100', 'Grouped Task', {}, 'group_1');

      const callBody = JSON.parse(fetchFn.mock.calls[0][1].body);
      expect(callBody.variables.groupId).toBe('group_1');
      expect(callBody.query).toContain('group_id');
    });

    it('sends column values as JSON string', async () => {
      const fetchFn = mockFetch({
        data: { create_item: { id: '999', name: 'Task' } },
      });

      const colValues = { status: { label: 'Working on it' } };
      await createItem('tok', '100', 'Task', colValues);

      const callBody = JSON.parse(fetchFn.mock.calls[0][1].body);
      expect(callBody.variables.columnValues).toBe(JSON.stringify(colValues));
    });

    it('throws on API error', async () => {
      mockFetch({ errors: [{ message: 'Invalid board' }] });

      await expect(createItem('tok', 'bad', 'Fail'))
        .rejects.toThrow('Monday API error: Invalid board');
    });

    it('throws on HTTP error', async () => {
      mockFetch({}, false, 403);

      await expect(createItem('tok', '100', 'Fail'))
        .rejects.toThrow('Monday API HTTP 403');
    });
  });

  // -------------------------------------------------------------------------
  // createSubitems
  // -------------------------------------------------------------------------
  describe('createSubitems()', () => {
    it('creates multiple subitems sequentially', async () => {
      const fetchFn = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: { create_subitem: { id: 's1', name: 'Sub A' } } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: { create_subitem: { id: 's2', name: 'Sub B' } } }),
        });
      vi.stubGlobal('fetch', fetchFn);

      const result = await createSubitems('tok', '10', [
        { name: 'Sub A' },
        { name: 'Sub B' },
      ]);

      expect(result.totalCreated).toBe(2);
      expect(result.totalRequested).toBe(2);
      expect(result.created).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
      expect(fetchFn).toHaveBeenCalledTimes(2);
    });

    it('continues on partial failure and reports errors', async () => {
      const fetchFn = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: { create_subitem: { id: 's1', name: 'Good' } } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ errors: [{ message: 'Duplicate' }] }),
        });
      vi.stubGlobal('fetch', fetchFn);

      const result = await createSubitems('tok', '10', [
        { name: 'Good' },
        { name: 'Bad' },
      ]);

      expect(result.totalCreated).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].name).toBe('Bad');
    });

    it('throws if subitems is empty array', async () => {
      await expect(createSubitems('tok', '10', []))
        .rejects.toThrow('subitems must be a non-empty array');
    });

    it('throws if subitems is not an array', async () => {
      await expect(createSubitems('tok', '10', 'not-array'))
        .rejects.toThrow('subitems must be a non-empty array');
    });
  });

  // -------------------------------------------------------------------------
  // updateItem
  // -------------------------------------------------------------------------
  describe('updateItem()', () => {
    it('sends correct column values mutation', async () => {
      const fetchFn = mockFetch({
        data: { change_multiple_column_values: { id: '10', name: 'Updated' } },
      });

      const colValues = { status: { label: 'Done' } };
      const result = await updateItem('tok', '100', '10', colValues);

      expect(result).toEqual({ id: '10', name: 'Updated' });

      const callBody = JSON.parse(fetchFn.mock.calls[0][1].body);
      expect(callBody.query).toContain('change_multiple_column_values');
      expect(callBody.variables.boardId).toBe('100');
      expect(callBody.variables.itemId).toBe('10');
      expect(callBody.variables.columnValues).toBe(JSON.stringify(colValues));
    });

    it('throws on API error', async () => {
      mockFetch({ errors: [{ message: 'Column not found' }] });

      await expect(updateItem('tok', '100', '10', {}))
        .rejects.toThrow('Monday API error: Column not found');
    });
  });

  // -------------------------------------------------------------------------
  // updateMultipleItems
  // -------------------------------------------------------------------------
  describe('updateMultipleItems()', () => {
    it('updates multiple items and returns summary', async () => {
      const fetchFn = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: { change_multiple_column_values: { id: '10', name: 'A' } } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: { change_multiple_column_values: { id: '11', name: 'B' } } }),
        });
      vi.stubGlobal('fetch', fetchFn);

      const result = await updateMultipleItems('tok', '100', ['10', '11'], { status: { label: 'Done' } });

      expect(result.totalUpdated).toBe(2);
      expect(result.totalRequested).toBe(2);
      expect(result.errors).toHaveLength(0);
    });

    it('throws for empty itemIds', async () => {
      await expect(updateMultipleItems('tok', '100', [], {}))
        .rejects.toThrow('itemIds must be a non-empty array');
    });
  });

  // -------------------------------------------------------------------------
  // Error handling for all mutations
  // -------------------------------------------------------------------------
  describe('error handling', () => {
    it('moveItemToGroup throws on HTTP error', async () => {
      mockFetch({}, false, 500);
      await expect(moveItemToGroup('tok', '10', 'g1')).rejects.toThrow('Monday API HTTP 500');
    });

    it('deleteItem throws on API error', async () => {
      mockFetch({ errors: [{ message: 'Item not found' }] });
      await expect(deleteItem('tok', '999')).rejects.toThrow('Monday API error: Item not found');
    });

    it('createGroup throws on network failure', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));
      await expect(createGroup('tok', '100', 'New Group')).rejects.toThrow('ECONNREFUSED');
    });
  });
});
