/**
 * Swiftly API Client — communicates with the Express backend.
 * All Monday.com API calls go through the backend, never directly from the frontend.
 */

const API_BASE = '/api';

async function request(endpoint, options = {}) {
  const { method = 'GET', body, token } = options;

  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const config = { method, headers };
  if (body) config.body = JSON.stringify(body);

  const response = await fetch(`${API_BASE}${endpoint}`, config);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    if (error.code === 'TOKEN_EXPIRED' && typeof window !== 'undefined' && window.mondaySdk) {
      // Try to refresh token and retry
      try {
        const newToken = await window.mondaySdk.get('sessionToken');
        if (newToken?.data) {
          headers.Authorization = `Bearer ${newToken.data}`;
          const retryResponse = await fetch(`${API_BASE}${endpoint}`, { method, headers, body: config.body });
          if (retryResponse.ok) return retryResponse.json();
        }
      } catch { /* fall through to error */ }
    }
    throw new Error(error.message || error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// --- Board APIs ---
export const getBoards = (token) =>
  request('/boards', { token });

export const getBoard = (token, boardId) =>
  request(`/boards/${boardId}`, { token });

export const getBoardItems = (token, boardId, params = {}) => {
  const query = new URLSearchParams(params).toString();
  return request(`/boards/${boardId}/items${query ? `?${query}` : ''}`, { token });
};

// --- Report APIs ---
export const generateReport = (token, boardIds, options = {}) =>
  request('/reports/generate', {
    method: 'POST',
    token,
    body: { boardIds, options },
  });

export const quickReport = (token, boardId) =>
  request('/reports/quick', {
    method: 'POST',
    token,
    body: { boardId },
  });

// --- AI APIs ---
export const aiChat = (token, question, boardIds, sessionId = null) =>
  request('/ai/chat', {
    method: 'POST',
    token,
    body: { question, boardIds, sessionId },
  });

export const aiInsights = (token, boardIds) =>
  request('/ai/insights', {
    method: 'POST',
    token,
    body: { boardIds },
  });

// --- Export APIs ---
export async function exportHtml(token, boardIds, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE}/export/html`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ boardIds, ...options }),
  });

  if (!response.ok) throw new Error('Export failed');
  return response.text();
}

export async function exportText(token, boardIds, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE}/export/text`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ boardIds, includeAi: true, ...options }),
  });

  if (!response.ok) throw new Error('Export failed');
  return response.text();
}

export const exportJson = (token, boardIds, options = {}) =>
  request('/export/json', { method: 'POST', token, body: { boardIds, includeAi: true, ...options } });

// --- Action APIs ---
export const createItem = (token, boardId, itemName, columnValues, groupId) =>
  request('/actions/create-item', { method: 'POST', token, body: { boardId, itemName, columnValues, groupId } });

export const createSubitems = (token, parentItemId, subitems) =>
  request('/actions/create-subitems', { method: 'POST', token, body: { parentItemId, subitems } });

export const updateItem = (token, boardId, itemId, columnValues) =>
  request('/actions/update-item', { method: 'POST', token, body: { boardId, itemId, columnValues } });

export const bulkUpdate = (token, boardId, itemIds, columnValues) =>
  request('/actions/bulk-update', { method: 'POST', token, body: { boardId, itemIds, columnValues } });

export const getUsers = (token) => request('/actions/users', { token });

// --- Health ---
export const healthCheck = () => request('/health');

export default {
  getBoards,
  getBoard,
  getBoardItems,
  generateReport,
  quickReport,
  aiChat,
  aiInsights,
  exportHtml,
  exportText,
  exportJson,
  healthCheck,
  createItem,
  createSubitems,
  updateItem,
  bulkUpdate,
  getUsers,
};
