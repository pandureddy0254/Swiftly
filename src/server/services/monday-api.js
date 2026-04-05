import config from '../config/index.js';

const MONDAY_API_URL = config.monday.apiUrl;
const API_VERSION = config.monday.apiVersion;

// Simple in-memory cache with 60s TTL to avoid redundant Monday.com API calls
// within the same short window (e.g. multiple tabs loading simultaneously).
const _cache = new Map();
const CACHE_TTL_MS = 60_000;

function getCached(key) {
  const entry = _cache.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    _cache.delete(key);
    return undefined;
  }
  return entry.data;
}

function setCache(key, data) {
  _cache.set(key, { data, ts: Date.now() });
  // Evict old entries periodically
  if (_cache.size > 500) {
    const now = Date.now();
    for (const [k, v] of _cache) {
      if (now - v.ts > CACHE_TTL_MS) _cache.delete(k);
    }
  }
}

// Response-level cache for getCrossBoardItems (60-second TTL)
const responseCache = new Map();
const RESPONSE_CACHE_TTL = 60 * 1000;

function getResponseCacheKey(token, boardIds) {
  const tokenHash = token.slice(-8);
  return `${tokenHash}_${[...boardIds].sort().join(',')}`;
}

function getCachedResponse(key) {
  const cached = responseCache.get(key);
  if (cached && Date.now() - cached.timestamp < RESPONSE_CACHE_TTL) {
    return cached.data;
  }
  responseCache.delete(key);
  return null;
}

function setCachedResponse(key, data) {
  if (responseCache.size > 200) {
    const oldest = responseCache.keys().next().value;
    responseCache.delete(oldest);
  }
  responseCache.set(key, { data, timestamp: Date.now() });
}

/**
 * Execute a GraphQL query against the Monday.com API.
 * Handles authentication, versioning, and error responses.
 */
async function executeQuery(query, variables = {}, token = null, retries = 3) {
  const apiToken = token || config.monday.apiToken;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    let response;
    try {
      response = await fetch(MONDAY_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: apiToken,
          'API-Version': API_VERSION,
        },
        body: JSON.stringify({ query, variables }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (response.status === 429 && attempt < retries) {
      const retryAfter = response.headers.get('retry-after');
      const delay = retryAfter ? parseInt(retryAfter, 10) * 1000 : Math.pow(2, attempt) * 1000;
      await new Promise((r) => setTimeout(r, delay));
      continue;
    }

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Monday API HTTP ${response.status}: ${text}`);
    }

    const result = await response.json();

    if (result.errors) {
      const messages = result.errors.map((e) => e.message).join('; ');
      throw new Error(`Monday API error: ${messages}`);
    }

    return result.data;
  }
}

/**
 * Get the current authenticated user's info.
 */
export async function getMe(token) {
  const data = await executeQuery(
    `query { me { id name email account { id name } } }`,
    {},
    token
  );
  return data.me;
}

/**
 * Get all boards accessible to the user.
 * Supports pagination via cursor.
 */
export async function getBoards(token) {
  const allBoards = [];
  let page = 1;
  const limit = 200;

  while (true) {
    const query = `query ($limit: Int!, $page: Int!) {
      boards(limit: $limit, page: $page) {
        id
        name
        description
        state
        board_kind
        columns { id title type settings_str }
        groups { id title color }
        owners { id name }
        items_count
      }
    }`;

    const data = await executeQuery(query, { limit, page }, token);
    const boards = data.boards || [];
    allBoards.push(...boards);

    if (boards.length < limit) break;
    page++;
    if (page > 10) break; // Safety cap at 2000 boards
  }

  return allBoards;
}

/**
 * Get a single board with full details.
 */
export async function getBoard(token, boardId) {
  const cacheKey = `board:${boardId}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const query = `query ($boardId: [ID!]!) {
    boards(ids: $boardId) {
      id
      name
      description
      state
      board_kind
      columns { id title type settings_str }
      groups { id title color }
      owners { id name }
      items_count
    }
  }`;

  const data = await executeQuery(query, { boardId: [boardId] }, token);
  const board = data.boards?.[0] || null;
  if (board) setCache(cacheKey, board);
  return board;
}

/**
 * Get items from a board with full column values and subitems.
 * Uses cursor-based pagination for large boards.
 */
export async function getBoardItems(token, boardId, { limit = 100, cursor = null } = {}) {
  const query = `query ($boardId: ID!, $limit: Int!, $cursor: String) {
    boards(ids: [$boardId]) {
      items_page(limit: $limit, cursor: $cursor) {
        cursor
        items {
          id
          name
          state
          group { id title }
          column_values {
            id
            type
            text
            value
            column { title }
          }
          subitems {
            id
            name
            state
            column_values {
              id
              type
              text
              value
              column { title }
            }
          }
          created_at
          updated_at
        }
      }
    }
  }`;

  const data = await executeQuery(query, { boardId, limit, cursor }, token);
  const page = data.boards?.[0]?.items_page;
  return {
    items: page?.items || [],
    cursor: page?.cursor || null,
    hasMore: !!page?.cursor,
  };
}

/**
 * Fetch ALL items from a board (auto-paginate).
 * Caution: For very large boards, this could be slow.
 */
export async function getAllBoardItems(token, boardId, maxItems = 500) {
  const allItems = [];
  let cursor = null;

  while (allItems.length < maxItems) {
    const batchSize = Math.min(100, maxItems - allItems.length);
    const result = await getBoardItems(token, boardId, { limit: batchSize, cursor });
    allItems.push(...result.items);

    if (!result.hasMore) break;
    cursor = result.cursor;
  }

  return allItems;
}

/**
 * Get items from MULTIPLE boards (cross-board aggregation).
 * This is the key differentiator — no existing app does this well.
 */
export async function getCrossBoardItems(token, boardIds, { maxItemsPerBoard = 200 } = {}) {
  const cacheKey = getResponseCacheKey(token, boardIds);
  const cached = getCachedResponse(cacheKey);
  if (cached) return cached;

  const settled = await Promise.allSettled(
    boardIds.map(async (boardId) => {
      try {
        // Fetch board metadata and items in parallel per board
        const [board, items] = await Promise.all([
          getBoard(token, boardId).catch((err) => {
            console.warn(`[Swiftly] Failed to fetch board ${boardId}:`, err.message);
            return null;
          }),
          getAllBoardItems(token, boardId, maxItemsPerBoard).catch((err) => {
            console.warn(`[Swiftly] Failed to fetch items for board ${boardId}:`, err.message);
            return [];
          }),
        ]);

        const boardName = board?.name || `Board ${boardId}`;

        return {
          boardId,
          boardName,
          name: boardName,          // duplicate for compatibility
          columns: board?.columns || [],
          groups: board?.groups || [],
          items: items.map((item) => ({
            ...item,
            column_values: item.column_values || [],
            group: item.group || { id: 'no_group', title: 'No Group' },
            subitems: item.subitems || [],
          })),
          itemCount: items.length,
          completedCount: items.filter((i) => i.state === 'done' || hasStatusDone(i)).length,
        };
      } catch (err) {
        console.error(`Failed to fetch board ${boardId}:`, err.message);
        return null;
      }
    })
  );

  const results = settled
    .filter((r) => r.status === 'fulfilled' && r.value)
    .map((r) => r.value);

  setCachedResponse(cacheKey, results);
  return results;
}

/**
 * Check if an item has a status column set to "Done" or similar.
 */
function hasStatusDone(item) {
  return (item.column_values || []).some((col) => {
    if (col.type !== 'status') return false;
    const text = (col.text || '').toLowerCase();
    return text === 'done' || text === 'completed' || text === 'closed';
  });
}

/**
 * Aggregate cross-board data into a unified report structure.
 */
export function aggregateBoardData(crossBoardData) {
  const report = {
    totalBoards: crossBoardData.length,
    totalItems: 0,
    totalSubitems: 0,
    completedItems: 0,
    overallProgress: 0,
    boards: [],
    statusBreakdown: {},
    groupBreakdown: {},
    timelineData: [],
  };

  for (const board of crossBoardData) {
    const boardStats = {
      id: board.boardId,
      name: board.boardName,
      boardName: board.boardName,  // both fields for compatibility
      totalItems: board.itemCount,
      completedItems: board.completedCount,
      progress: board.itemCount > 0
        ? Math.round((board.completedCount / board.itemCount) * 100)
        : 0,
      subitems: 0,
      groups: {},
      items: board.items || [],
    };

    for (const item of (board.items || [])) {
      report.totalItems++;
      if (item.subitems && item.subitems.length > 0) {
        report.totalSubitems += item.subitems.length;
        boardStats.subitems += item.subitems.length;
      }

      // Status breakdown
      const statusCol = (item.column_values || []).find((c) => c.type === 'status');
      if (statusCol?.text) {
        const status = statusCol.text;
        report.statusBreakdown[status] = (report.statusBreakdown[status] || 0) + 1;
      }

      // Group breakdown
      const groupTitle = item.group?.title || 'No Group';
      boardStats.groups[groupTitle] = (boardStats.groups[groupTitle] || 0) + 1;
      report.groupBreakdown[groupTitle] = (report.groupBreakdown[groupTitle] || 0) + 1;

      // Timeline data
      const dateCol = (item.column_values || []).find((c) => c.type === 'date');
      if (dateCol?.text) {
        report.timelineData.push({
          date: dateCol.text,
          board: board.boardName,
          item: item.name,
          status: statusCol?.text || 'No Status',
        });
      }
    }

    report.completedItems += board.completedCount;
    report.boards.push(boardStats);
  }

  report.overallProgress = report.totalItems > 0
    ? Math.round((report.completedItems / report.totalItems) * 100)
    : 0;

  report.timelineData.sort((a, b) => new Date(a.date) - new Date(b.date));

  return report;
}

/**
 * Get workspace info.
 */
export async function getWorkspaces(token) {
  const data = await executeQuery(
    `query { workspaces { id name kind description }  }`,
    {},
    token
  );
  return data.workspaces;
}

export default {
  executeQuery,
  getMe,
  getBoards,
  getBoard,
  getBoardItems,
  getAllBoardItems,
  getCrossBoardItems,
  aggregateBoardData,
  getWorkspaces,
};
