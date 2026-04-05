import config from '../config/index.js';

const MONDAY_API_URL = config.monday.apiUrl;
const API_VERSION = config.monday.apiVersion;

/**
 * Execute a GraphQL query against the Monday.com API.
 * Handles authentication, versioning, and error responses.
 */
async function executeQuery(query, variables = {}, token = null) {
  const apiToken = token || config.monday.apiToken;

  const response = await fetch(MONDAY_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: apiToken,
      'API-Version': API_VERSION,
    },
    body: JSON.stringify({ query, variables }),
  });

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
export async function getBoards(token, { limit = 25, cursor = null } = {}) {
  const query = `query ($limit: Int!) {
    boards(limit: $limit) {
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

  const data = await executeQuery(query, { limit }, token);
  return data.boards;
}

/**
 * Get a single board with full details.
 */
export async function getBoard(token, boardId) {
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
  return data.boards?.[0] || null;
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
  const results = [];

  for (const boardId of boardIds) {
    const board = await getBoard(token, boardId);
    const items = await getAllBoardItems(token, boardId, maxItemsPerBoard);

    results.push({
      boardId,
      boardName: board?.name || 'Unknown',
      columns: board?.columns || [],
      groups: board?.groups || [],
      items,
      itemCount: items.length,
      completedCount: items.filter((i) => i.state === 'done' || hasStatusDone(i)).length,
    });
  }

  return results;
}

/**
 * Check if an item has a status column set to "Done" or similar.
 */
function hasStatusDone(item) {
  return item.column_values?.some((col) => {
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
      totalItems: board.itemCount,
      completedItems: board.completedCount,
      progress: board.itemCount > 0
        ? Math.round((board.completedCount / board.itemCount) * 100)
        : 0,
      subitems: 0,
      groups: {},
    };

    for (const item of board.items) {
      report.totalItems++;
      if (item.subitems) {
        report.totalSubitems += item.subitems.length;
        boardStats.subitems += item.subitems.length;
      }

      // Status breakdown
      const statusCol = item.column_values?.find((c) => c.type === 'status');
      if (statusCol?.text) {
        const status = statusCol.text;
        report.statusBreakdown[status] = (report.statusBreakdown[status] || 0) + 1;
      }

      // Group breakdown
      if (item.group?.title) {
        const group = item.group.title;
        boardStats.groups[group] = (boardStats.groups[group] || 0) + 1;
        report.groupBreakdown[group] = (report.groupBreakdown[group] || 0) + 1;
      }

      // Timeline data
      const dateCol = item.column_values?.find((c) => c.type === 'date');
      if (dateCol?.text) {
        report.timelineData.push({
          date: dateCol.text,
          board: board.boardName,
          item: item.name,
          status: statusCol?.text || 'Unknown',
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
