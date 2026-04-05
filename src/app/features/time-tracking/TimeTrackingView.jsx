import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as api from '@core/api/swiftly-client';
import { useSwiftly } from '@core/state/useSwiftly';
import BoardSelector from '@core/components/BoardSelector';
import { ActiveTimer, QuickStartList, StopSwitchDialog } from './Timer';
import TimeLog from './TimeLog';
import { TimeChart, BoardSummary, SubitemRollup } from './TimeCharts';
import TimeSummary from './TimeSummary';
import { formatDuration, formatTimerDisplay } from './timeTrackingUtils';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const TIMER_KEY = 'swiftly_active_timer';
const LOGS_KEY = 'swiftly_time_logs';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function loadTimerState() {
  try {
    const raw = localStorage.getItem(TIMER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveTimerState(state) {
  if (state) {
    localStorage.setItem(TIMER_KEY, JSON.stringify(state));
  } else {
    localStorage.removeItem(TIMER_KEY);
  }
}

function loadLogs() {
  try {
    const raw = localStorage.getItem(LOGS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLogs(logs) {
  localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
}

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------
function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className={`swiftly-toast swiftly-toast--${type}`}>
      {type === 'success' ? '\u2705' : '\u274C'} {message}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function TimeTrackingView() {
  const {
    token,
    boards,
    selectedBoardIds,
    toggleBoard: ctxToggleBoard,
    fetchBoardItems,
  } = useSwiftly();

  // Items for quick start
  const [allItems, setAllItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);

  // Timer
  const [activeTimer, setActiveTimer] = useState(() => loadTimerState());
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef(null);

  // Logs
  const [logs, setLogs] = useState(() => loadLogs());

  // View range
  const [viewRange, setViewRange] = useState('week');

  // Stop note dialog
  const [pendingStop, setPendingStop] = useState(null);
  const [stopNote, setStopNote] = useState('');

  // Toast
  const [toast, setToast] = useState(null);
  const showToast = useCallback((message, type = 'success') => setToast({ message, type }), []);

  // ------ Load items when boards change (uses cached board items) ------
  useEffect(() => {
    if (selectedBoardIds.length === 0) {
      setAllItems([]);
      return;
    }

    let cancelled = false;
    async function loadItems() {
      setLoadingItems(true);
      try {
        const results = await Promise.all(
          selectedBoardIds.map(async (boardId) => {
            const board = boards.find((b) => String(b.id) === boardId);
            const boardName = board?.name || board?.boardName || `Board ${boardId}`;
            const items = await fetchBoardItems(boardId);
            const mapped = [];
            (items || []).forEach((item) => {
              mapped.push({
                id: item.id,
                name: item.name,
                boardId,
                boardName,
                isSubitem: false,
                parentItemId: null,
                parentItemName: null,
              });
              if (item.subitems && item.subitems.length > 0) {
                item.subitems.forEach((sub) => {
                  mapped.push({
                    id: sub.id,
                    name: sub.name,
                    boardId,
                    boardName,
                    isSubitem: true,
                    parentItemId: item.id,
                    parentItemName: item.name,
                  });
                });
              }
            });
            return mapped;
          })
        );
        if (!cancelled) setAllItems(results.flat());
      } catch (err) {
        if (!cancelled) showToast('Failed to load items: ' + err.message, 'error');
      } finally {
        if (!cancelled) setLoadingItems(false);
      }
    }
    loadItems();
    return () => { cancelled = true; };
  }, [selectedBoardIds, boards, fetchBoardItems, showToast]);

  // ------ Timer tick ------
  useEffect(() => {
    if (activeTimer) {
      const tick = () => {
        const diff = Date.now() - new Date(activeTimer.startTime).getTime();
        setElapsed(diff);
      };
      tick();
      intervalRef.current = setInterval(tick, 1000);
      return () => clearInterval(intervalRef.current);
    } else {
      setElapsed(0);
    }
  }, [activeTimer]);

  // ------ Persist timer state ------
  useEffect(() => {
    saveTimerState(activeTimer);
  }, [activeTimer]);

  // ------ Persist logs ------
  useEffect(() => {
    saveLogs(logs);
  }, [logs]);

  const toggleBoard = ctxToggleBoard;

  // ------ Start timer ------
  const startTimer = useCallback((item) => {
    if (activeTimer) {
      // Stop current timer first by showing stop dialog
      setPendingStop(item);
      setStopNote('');
      return;
    }
    setActiveTimer({
      itemId: item.id,
      itemName: item.name,
      boardId: item.boardId,
      boardName: item.boardName,
      parentItemId: item.parentItemId || null,
      parentItemName: item.parentItemName || null,
      startTime: new Date().toISOString(),
    });
    showToast(`Timer started for "${item.name}"`);
  }, [activeTimer, showToast]);

  // ------ Stop timer (creates log entry) ------
  const stopTimer = useCallback((notes = '') => {
    if (!activeTimer) return;
    const duration = Date.now() - new Date(activeTimer.startTime).getTime();
    if (duration < 5000) {
      setActiveTimer(null);
      showToast('Timer discarded (less than 5 seconds)', 'error');
      return;
    }
    const entry = {
      id: generateId(),
      itemId: activeTimer.itemId,
      itemName: activeTimer.itemName,
      boardId: activeTimer.boardId,
      boardName: activeTimer.boardName,
      parentItemId: activeTimer.parentItemId,
      parentItemName: activeTimer.parentItemName,
      duration,
      date: new Date().toISOString(),
      notes,
      billable: true,
    };
    setLogs((prev) => [entry, ...prev]);
    setActiveTimer(null);
    showToast(`Logged ${formatDuration(duration)} for "${entry.itemName}"`);
  }, [activeTimer, showToast]);

  // ------ Stop and switch ------
  const confirmStopAndSwitch = useCallback(() => {
    stopTimer(stopNote);
    if (pendingStop) {
      // Start the new timer after a tiny delay to let state settle
      setTimeout(() => {
        setActiveTimer({
          itemId: pendingStop.id,
          itemName: pendingStop.name,
          boardId: pendingStop.boardId,
          boardName: pendingStop.boardName,
          parentItemId: pendingStop.parentItemId || null,
          parentItemName: pendingStop.parentItemName || null,
          startTime: new Date().toISOString(),
        });
      }, 50);
    }
    setPendingStop(null);
    setStopNote('');
  }, [stopTimer, pendingStop, stopNote]);

  // ------ Toggle billable ------
  const toggleBillable = useCallback((logId) => {
    setLogs((prev) => prev.map((log) =>
      log.id === logId ? { ...log, billable: !log.billable } : log
    ));
  }, []);

  // ------ Delete log ------
  const deleteLog = useCallback((logId) => {
    setLogs((prev) => prev.filter((log) => log.id !== logId));
    showToast('Entry deleted');
  }, [showToast]);

  // ------ Handle stop button click ------
  const handleStopClick = useCallback(() => {
    setPendingStop(null);
    setStopNote('');
    // Show simple stop — directly stop
    stopTimer('');
  }, [stopTimer]);

  // ------ Loading state ------
  if (boards.length === 0) {
    return (
      <div className="swiftly-loading">
        <div className="swiftly-spinner" />
        Loading boards...
      </div>
    );
  }

  return (
    <div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Stop and Switch Dialog */}
      <StopSwitchDialog
        activeTimer={activeTimer}
        elapsed={elapsed}
        pendingStop={pendingStop}
        stopNote={stopNote}
        onStopNoteChange={setStopNote}
        onConfirm={confirmStopAndSwitch}
        onCancel={() => setPendingStop(null)}
      />

      {/* Board Selector */}
      <BoardSelector label="Select Boards" />

      {/* Active Timer */}
      <ActiveTimer timer={activeTimer} elapsed={elapsed} onStop={handleStopClick} />

      {/* View Range Toggle */}
      <div style={{ display: 'flex', gap: 8, margin: '12px 0' }}>
        <button
          className={`swiftly-board-chip ${viewRange === 'week' ? 'swiftly-board-chip--selected' : ''}`}
          onClick={() => setViewRange('week')}
        >
          Weekly
        </button>
        <button
          className={`swiftly-board-chip ${viewRange === 'month' ? 'swiftly-board-chip--selected' : ''}`}
          onClick={() => setViewRange('month')}
        >
          Monthly
        </button>
      </div>

      {/* Billable Stats */}
      <TimeSummary logs={logs} />

      {/* Quick Start */}
      <QuickStartList
        items={allItems}
        activeItemId={activeTimer?.itemId}
        onStart={startTimer}
        loading={loadingItems}
      />

      {/* Board Summary */}
      <BoardSummary logs={logs} viewRange={viewRange} />

      {/* Weekly/Monthly Chart */}
      <TimeChart logs={logs} viewRange={viewRange} />

      {/* Subitem Rollup */}
      <SubitemRollup logs={logs} />

      {/* Time Log Table */}
      <TimeLog logs={logs} onToggleBillable={toggleBillable} onDeleteLog={deleteLog} />
    </div>
  );
}
