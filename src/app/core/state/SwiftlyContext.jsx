import React, { createContext, useReducer, useCallback, useRef, useEffect } from 'react';
import * as api from '@core/api/swiftly-client';

export const SwiftlyContext = createContext(null);

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const initialState = {
  boards: [],
  boardsLoaded: false,
  selectedBoardIds: [],
  reportData: null,
  insights: [],
  boardItems: {},        // boardId -> { items, fetchedAt }
  loading: false,
  error: null,
  lastFetchedAt: null,
  _lastBoardIds: null,   // track which boardIds the cache corresponds to
};

// Actions
const SET_BOARDS = 'SET_BOARDS';
const SET_SELECTED_BOARDS = 'SET_SELECTED_BOARDS';
const SET_REPORT_DATA = 'SET_REPORT_DATA';
const SET_INSIGHTS = 'SET_INSIGHTS';
const SET_BOARD_ITEMS = 'SET_BOARD_ITEMS';
const SET_LOADING = 'SET_LOADING';
const SET_ERROR = 'SET_ERROR';
const SET_BOARDS_LOADED = 'SET_BOARDS_LOADED';
const INVALIDATE_CACHE = 'INVALIDATE_CACHE';
const INVALIDATE_BOARD_ITEMS = 'INVALIDATE_BOARD_ITEMS';
const TOGGLE_BOARD = 'TOGGLE_BOARD';

function reducer(state, action) {
  switch (action.type) {
    case SET_BOARDS:
      return { ...state, boards: action.payload };
    case SET_SELECTED_BOARDS:
      return { ...state, selectedBoardIds: action.payload };
    case SET_REPORT_DATA:
      return {
        ...state,
        reportData: action.payload.reportData,
        lastFetchedAt: Date.now(),
        _lastBoardIds: action.payload.boardIds,
      };
    case SET_INSIGHTS:
      return { ...state, insights: action.payload };
    case SET_BOARD_ITEMS:
      return {
        ...state,
        boardItems: {
          ...state.boardItems,
          [action.payload.boardId]: {
            items: action.payload.items,
            fetchedAt: Date.now(),
          },
        },
      };
    case SET_LOADING:
      return { ...state, loading: action.payload };
    case SET_ERROR:
      return { ...state, error: action.payload };
    case SET_BOARDS_LOADED:
      return { ...state, boardsLoaded: true };
    case INVALIDATE_CACHE:
      return {
        ...state,
        reportData: null,
        insights: [],
        lastFetchedAt: null,
        _lastBoardIds: null,
        boardItems: {},
      };
    case TOGGLE_BOARD: {
      const id = String(action.payload);
      return {
        ...state,
        selectedBoardIds: state.selectedBoardIds.includes(id)
          ? state.selectedBoardIds.filter((x) => x !== id)
          : [...state.selectedBoardIds, id],
      };
    }
    case INVALIDATE_BOARD_ITEMS:
      if (action.payload) {
        const next = { ...state.boardItems };
        delete next[action.payload];
        return { ...state, boardItems: next };
      }
      return { ...state, boardItems: {} };
    default:
      return state;
  }
}

function arraysEqual(a, b) {
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((v, i) => v === sortedB[i]);
}

export function SwiftlyProvider({ token, children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const loadRef = useRef(0);
  const boardsFetchedRef = useRef(false);

  // Fetch boards list once on mount (or when token changes)
  useEffect(() => {
    if (!token || boardsFetchedRef.current) return;
    boardsFetchedRef.current = true;

    async function loadBoards() {
      try {
        const result = await api.getBoards(token);
        dispatch({ type: SET_BOARDS, payload: result.boards || [] });
      } catch (err) {
        dispatch({ type: SET_ERROR, payload: err.message });
      }
      dispatch({ type: SET_BOARDS_LOADED });
    }
    loadBoards();
  }, [token]);

  const setSelectedBoardIds = useCallback((ids) => {
    dispatch({ type: SET_SELECTED_BOARDS, payload: ids.map(String) });
  }, []);

  const toggleBoard = useCallback((boardId) => {
    dispatch({ type: TOGGLE_BOARD, payload: boardId });
  }, []);

  const isCacheValid = useCallback((boardIds) => {
    if (!state.lastFetchedAt) return false;
    if (Date.now() - state.lastFetchedAt > CACHE_TTL) return false;
    if (!arraysEqual(state._lastBoardIds, boardIds)) return false;
    return true;
  }, [state.lastFetchedAt, state._lastBoardIds]);

  const fetchDashboardData = useCallback(async (force = false) => {
    const boardIds = state.selectedBoardIds;
    if (boardIds.length === 0) return null;

    // Return cached data if valid
    if (!force && isCacheValid(boardIds) && state.reportData) {
      return { reportData: state.reportData, insights: state.insights };
    }

    const loadId = ++loadRef.current;
    dispatch({ type: SET_LOADING, payload: true });
    dispatch({ type: SET_ERROR, payload: null });

    try {
      const [reportResult, insightsResult] = await Promise.allSettled([
        api.generateReport(token, boardIds, {
          tone: 'professional',
          audience: 'manager',
          includeRecommendations: true,
        }),
        api.aiInsights(token, boardIds),
      ]);

      if (loadId !== loadRef.current) return null;

      const report = reportResult.status === 'fulfilled' ? reportResult.value : null;
      const insightsData = insightsResult.status === 'fulfilled' ? insightsResult.value : null;

      if (!report) {
        dispatch({ type: SET_ERROR, payload: 'Failed to load report data. Please try again.' });
        dispatch({ type: SET_LOADING, payload: false });
        return null;
      }

      dispatch({
        type: SET_REPORT_DATA,
        payload: { reportData: report.data, boardIds: [...boardIds] },
      });

      const allInsights = [
        ...(report.insights || []),
        ...(insightsData?.insights || []),
      ];
      dispatch({ type: SET_INSIGHTS, payload: allInsights });
      dispatch({ type: SET_LOADING, payload: false });

      return { reportData: report.data, insights: allInsights, report };
    } catch (err) {
      if (loadId === loadRef.current) {
        dispatch({ type: SET_ERROR, payload: err.message });
        dispatch({ type: SET_LOADING, payload: false });
      }
      return null;
    }
  }, [token, state.selectedBoardIds, state.reportData, state.insights, isCacheValid]);

  const fetchBoardItems = useCallback(async (boardId, force = false) => {
    if (!boardId) return [];

    // Check individual board item cache
    const cached = state.boardItems[boardId];
    if (!force && cached && (Date.now() - cached.fetchedAt) < CACHE_TTL) {
      return cached.items;
    }

    try {
      const result = await api.getBoardItems(token, boardId);
      const items = result.items || [];
      dispatch({ type: SET_BOARD_ITEMS, payload: { boardId, items } });
      return items;
    } catch (err) {
      console.error(`Failed to fetch items for board ${boardId}:`, err);
      return [];
    }
  }, [token, state.boardItems]);

  const invalidateCache = useCallback(() => {
    dispatch({ type: INVALIDATE_CACHE });
  }, []);

  const invalidateBoardItems = useCallback((boardId) => {
    dispatch({ type: INVALIDATE_BOARD_ITEMS, payload: boardId || null });
  }, []);

  const value = {
    state,
    token,
    boards: state.boards,
    boardsLoaded: state.boardsLoaded,
    selectedBoardIds: state.selectedBoardIds,
    reportData: state.reportData,
    insights: state.insights,
    loading: state.loading,
    error: state.error,
    boardItems: state.boardItems,
    setSelectedBoardIds,
    toggleBoard,
    fetchDashboardData,
    fetchBoardItems,
    invalidateCache,
    invalidateBoardItems,
  };

  return (
    <SwiftlyContext.Provider value={value}>
      {children}
    </SwiftlyContext.Provider>
  );
}

export default SwiftlyProvider;
