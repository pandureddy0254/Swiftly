import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import * as api from '@core/api/swiftly-client';
import { useSwiftly } from '@core/state/useSwiftly';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const TIMER_KEY = 'swiftly_active_timer';
const LOGS_KEY = 'swiftly_time_logs';
const CHART_COLORS = ['#0073ea', '#00ca72', '#fdab3d', '#e2445c', '#579bfc', '#a25ddc'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function formatDuration(ms) {
  if (!ms || ms <= 0) return '0h 0m';
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

function formatTimerDisplay(ms) {
  if (!ms || ms <= 0) return '00:00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((v) => String(v).padStart(2, '0')).join(':');
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getMonthStart(date) {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
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
// Active Timer Display
// ---------------------------------------------------------------------------
function ActiveTimer({ timer, elapsed, onStop }) {
  if (!timer) return null;

  return (
    <div className="swiftly-card" style={{ borderLeft: '4px solid var(--swiftly-danger)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 20, animation: 'pulse 1.5s infinite' }}>{'\u{1F534}'}</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>{timer.itemName}</div>
            <div style={{ fontSize: 12, color: 'var(--swiftly-text-secondary)' }}>{timer.boardName}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontFamily: 'monospace', fontSize: 28, fontWeight: 700, color: 'var(--swiftly-danger)' }}>
            {formatTimerDisplay(elapsed)}
          </span>
          <button
            className="swiftly-action-btn"
            onClick={onStop}
            style={{ background: 'var(--swiftly-danger)', color: '#fff', border: 'none', padding: '8px 20px', fontSize: 14, fontWeight: 600 }}
          >
            Stop
          </button>
        </div>
      </div>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Quick Start Item List
// ---------------------------------------------------------------------------
function QuickStartList({ items, activeItemId, onStart, loading }) {
  if (loading) {
    return (
      <div className="swiftly-card">
        <div className="swiftly-card-header">
          <span className="swiftly-card-title">Quick Start</span>
        </div>
        <div style={{ textAlign: 'center', padding: 24, color: 'var(--swiftly-text-secondary)' }}>
          <div className="swiftly-spinner" style={{ margin: '0 auto 8px' }} />
          Loading items...
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="swiftly-card">
        <div className="swiftly-card-header">
          <span className="swiftly-card-title">Quick Start</span>
        </div>
        <div style={{ textAlign: 'center', padding: 24, color: 'var(--swiftly-text-secondary)', fontSize: 13 }}>
          Select a board above to see items you can track time for.
        </div>
      </div>
    );
  }

  return (
    <div className="swiftly-card">
      <div className="swiftly-card-header">
        <span className="swiftly-card-title">Quick Start</span>
        <span style={{ fontSize: 12, color: 'var(--swiftly-text-secondary)' }}>Click play to start timer</span>
      </div>
      <div style={{ maxHeight: 280, overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--swiftly-border)', position: 'sticky', top: 0, background: 'var(--swiftly-card-bg, #fff)' }}>
              <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--swiftly-text-secondary)', fontWeight: 500 }}>Item</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--swiftly-text-secondary)', fontWeight: 500 }}>Board</th>
              <th style={{ textAlign: 'center', padding: '8px 12px', color: 'var(--swiftly-text-secondary)', fontWeight: 500, width: 60 }}>Track</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const isActive = activeItemId === item.id;
              return (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--swiftly-border)' }}>
                  <td style={{ padding: '8px 12px', fontWeight: 500 }}>
                    {item.name}
                    {item.isSubitem && (
                      <span style={{ fontSize: 10, marginLeft: 6, color: 'var(--swiftly-primary)', background: 'rgba(0,115,234,0.08)', padding: '1px 6px', borderRadius: 4 }}>
                        subitem
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '8px 12px', color: 'var(--swiftly-text-secondary)' }}>{item.boardName}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                    <button
                      onClick={() => onStart(item)}
                      disabled={isActive}
                      style={{
                        background: 'none', border: 'none', cursor: isActive ? 'default' : 'pointer',
                        fontSize: 20, opacity: isActive ? 0.4 : 1, padding: 2,
                      }}
                      title={isActive ? 'Timer running' : 'Start timer'}
                    >
                      {isActive ? '\u{23F8}\u{FE0F}' : '\u{25B6}\u{FE0F}'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Board Summary Bars
// ---------------------------------------------------------------------------
function BoardSummary({ logs, viewRange }) {
  const filtered = useMemo(() => {
    const now = new Date();
    const start = viewRange === 'week' ? getWeekStart(now) : getMonthStart(now);
    return logs.filter((log) => new Date(log.date) >= start);
  }, [logs, viewRange]);

  const totalMs = filtered.reduce((sum, l) => sum + l.duration, 0);

  const byBoard = useMemo(() => {
    const map = {};
    filtered.forEach((log) => {
      if (!map[log.boardName]) map[log.boardName] = { name: log.boardName, ms: 0 };
      map[log.boardName].ms += log.duration;
    });
    return Object.values(map).sort((a, b) => b.ms - a.ms);
  }, [filtered]);

  const maxMs = byBoard.length > 0 ? byBoard[0].ms : 1;

  return (
    <div className="swiftly-card">
      <div className="swiftly-card-header">
        <span className="swiftly-card-title">Summary</span>
        <span style={{ fontSize: 13, fontWeight: 600 }}>
          {viewRange === 'week' ? 'This Week' : 'This Month'}: {formatDuration(totalMs)}
        </span>
      </div>
      {byBoard.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 20, color: 'var(--swiftly-text-secondary)', fontSize: 13 }}>
          No time logged yet for this period.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {byBoard.map((board, i) => {
            const pct = Math.max((board.ms / maxMs) * 100, 4);
            const color = CHART_COLORS[i % CHART_COLORS.length];
            return (
              <div key={board.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ height: 22, borderRadius: 4, background: 'var(--swiftly-border)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4, transition: 'width 0.4s ease' }} />
                  </div>
                </div>
                <span style={{ fontSize: 13, fontWeight: 500, minWidth: 160, textAlign: 'right' }}>
                  {board.name}: {formatDuration(board.ms)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Subitem Time Rollup
// ---------------------------------------------------------------------------
function SubitemRollup({ logs }) {
  const rollup = useMemo(() => {
    const parentMap = {};
    logs.forEach((log) => {
      const parentId = log.parentItemId || log.itemId;
      const parentName = log.parentItemName || log.itemName;
      if (!parentMap[parentId]) {
        parentMap[parentId] = { name: parentName, boardName: log.boardName, total: 0, own: 0, subitemTime: 0, subitems: {} };
      }
      if (log.parentItemId && log.parentItemId !== log.itemId) {
        parentMap[parentId].subitemTime += log.duration;
        if (!parentMap[parentId].subitems[log.itemId]) {
          parentMap[parentId].subitems[log.itemId] = { name: log.itemName, ms: 0 };
        }
        parentMap[parentId].subitems[log.itemId].ms += log.duration;
      } else {
        parentMap[parentId].own += log.duration;
      }
      parentMap[parentId].total += log.duration;
    });
    return Object.values(parentMap)
      .filter((p) => p.subitemTime > 0)
      .sort((a, b) => b.total - a.total);
  }, [logs]);

  if (rollup.length === 0) return null;

  return (
    <div className="swiftly-card">
      <div className="swiftly-card-header">
        <span className="swiftly-card-title">Subitem Time Rollup</span>
        <span style={{ fontSize: 12, color: 'var(--swiftly-text-secondary)' }}>Aggregated from subitems to parents</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {rollup.map((parent) => (
          <div key={parent.name} style={{ padding: '10px 12px', background: 'rgba(0,115,234,0.03)', borderRadius: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>{parent.name}</span>
              <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--swiftly-primary)' }}>{formatDuration(parent.total)}</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--swiftly-text-secondary)', marginBottom: 4 }}>
              Own: {formatDuration(parent.own)} | Subitems: {formatDuration(parent.subitemTime)}
            </div>
            <div style={{ paddingLeft: 16 }}>
              {Object.values(parent.subitems).map((si) => (
                <div key={si.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--swiftly-text-secondary)', padding: '2px 0' }}>
                  <span>{'\u2514'} {si.name}</span>
                  <span>{formatDuration(si.ms)}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Weekly/Monthly Bar Chart
// ---------------------------------------------------------------------------
function TimeChart({ logs, viewRange }) {
  const chartData = useMemo(() => {
    const now = new Date();
    if (viewRange === 'week') {
      const weekStart = getWeekStart(now);
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const buckets = days.map((name, i) => {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + i);
        return { name, date: d.toDateString(), hours: 0 };
      });
      logs.forEach((log) => {
        const logDate = new Date(log.date).toDateString();
        const bucket = buckets.find((b) => b.date === logDate);
        if (bucket) bucket.hours += log.duration / 3600000;
      });
      return buckets.map((b) => ({ name: b.name, hours: Math.round(b.hours * 100) / 100 }));
    } else {
      const monthStart = getMonthStart(now);
      const weeks = [];
      const tempDate = new Date(monthStart);
      let weekNum = 1;
      while (tempDate.getMonth() === now.getMonth()) {
        const wStart = new Date(tempDate);
        const wEnd = new Date(tempDate);
        wEnd.setDate(wEnd.getDate() + 6);
        weeks.push({ name: `Wk ${weekNum}`, start: wStart, end: wEnd, hours: 0 });
        tempDate.setDate(tempDate.getDate() + 7);
        weekNum++;
      }
      logs.forEach((log) => {
        const logDate = new Date(log.date);
        const week = weeks.find((w) => logDate >= w.start && logDate <= w.end);
        if (week) week.hours += log.duration / 3600000;
      });
      return weeks.map((w) => ({ name: w.name, hours: Math.round(w.hours * 100) / 100 }));
    }
  }, [logs, viewRange]);

  return (
    <div className="swiftly-card">
      <div className="swiftly-card-header">
        <span className="swiftly-card-title">{viewRange === 'week' ? 'This Week' : 'This Month'}</span>
      </div>
      {chartData.every((d) => d.hours === 0) ? (
        <div style={{ textAlign: 'center', padding: 24, color: 'var(--swiftly-text-secondary)', fontSize: 13 }}>
          No time data to chart for this period.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--swiftly-border)" />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--swiftly-text-secondary)' }} />
            <YAxis tick={{ fontSize: 12, fill: 'var(--swiftly-text-secondary)' }} unit="h" />
            <Tooltip
              formatter={(value) => [`${value}h`, 'Hours']}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--swiftly-border)' }}
            />
            <Bar dataKey="hours" fill="var(--swiftly-primary)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Billable Hours Summary
// ---------------------------------------------------------------------------
function BillableSummary({ logs }) {
  const stats = useMemo(() => {
    let billable = 0;
    let nonBillable = 0;
    logs.forEach((log) => {
      if (log.billable) billable += log.duration;
      else nonBillable += log.duration;
    });
    return { billable, nonBillable, total: billable + nonBillable };
  }, [logs]);

  return (
    <div className="swiftly-grid swiftly-grid-3">
      <div className="swiftly-card swiftly-stat">
        <div className="swiftly-stat-value" style={{ color: 'var(--swiftly-primary)' }}>{formatDuration(stats.total)}</div>
        <div className="swiftly-stat-label">Total Logged</div>
      </div>
      <div className="swiftly-card swiftly-stat">
        <div className="swiftly-stat-value" style={{ color: 'var(--swiftly-success)' }}>{formatDuration(stats.billable)}</div>
        <div className="swiftly-stat-label">Billable</div>
      </div>
      <div className="swiftly-card swiftly-stat">
        <div className="swiftly-stat-value" style={{ color: 'var(--swiftly-warning)' }}>{formatDuration(stats.nonBillable)}</div>
        <div className="swiftly-stat-label">Non-Billable</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Time Log Table
// ---------------------------------------------------------------------------
function TimeLogTable({ logs, onToggleBillable, onDeleteLog }) {
  const sorted = useMemo(() => [...logs].sort((a, b) => new Date(b.date) - new Date(a.date)), [logs]);

  if (sorted.length === 0) {
    return (
      <div className="swiftly-card">
        <div className="swiftly-card-header">
          <span className="swiftly-card-title">Time Log</span>
        </div>
        <div style={{ textAlign: 'center', padding: 24, color: 'var(--swiftly-text-secondary)', fontSize: 13 }}>
          No entries yet. Start a timer to begin logging time.
        </div>
      </div>
    );
  }

  return (
    <div className="swiftly-card">
      <div className="swiftly-card-header">
        <span className="swiftly-card-title">Time Log</span>
        <span style={{ fontSize: 12, color: 'var(--swiftly-text-secondary)' }}>{sorted.length} entries</span>
      </div>
      <div style={{ maxHeight: 360, overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--swiftly-border)', position: 'sticky', top: 0, background: 'var(--swiftly-card-bg, #fff)' }}>
              <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--swiftly-text-secondary)', fontWeight: 500 }}>Date</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--swiftly-text-secondary)', fontWeight: 500 }}>Item</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--swiftly-text-secondary)', fontWeight: 500 }}>Time</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--swiftly-text-secondary)', fontWeight: 500 }}>Board</th>
              <th style={{ textAlign: 'center', padding: '8px 12px', color: 'var(--swiftly-text-secondary)', fontWeight: 500 }}>Bill?</th>
              <th style={{ textAlign: 'center', padding: '8px 12px', color: 'var(--swiftly-text-secondary)', fontWeight: 500, width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((log) => (
              <tr key={log.id} style={{ borderBottom: '1px solid var(--swiftly-border)' }}>
                <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>{formatDate(log.date)}</td>
                <td style={{ padding: '8px 12px', fontWeight: 500 }}>
                  {log.itemName}
                  {log.notes && (
                    <div style={{ fontSize: 11, color: 'var(--swiftly-text-secondary)', marginTop: 2 }}>{log.notes}</div>
                  )}
                </td>
                <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontWeight: 500 }}>{formatDuration(log.duration)}</td>
                <td style={{ padding: '8px 12px', color: 'var(--swiftly-text-secondary)' }}>{log.boardName}</td>
                <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                  <button
                    onClick={() => onToggleBillable(log.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}
                    title={log.billable ? 'Mark non-billable' : 'Mark billable'}
                  >
                    {log.billable ? '\u2705' : '\u2B1C'}
                  </button>
                </td>
                <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                  <button
                    onClick={() => onDeleteLog(log.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--swiftly-text-secondary)' }}
                    title="Delete entry"
                  >
                    {'\u{1F5D1}'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
      {pendingStop && (
        <div className="swiftly-modal-overlay" onClick={() => setPendingStop(null)}>
          <div className="swiftly-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="swiftly-modal-header">
              <span className="swiftly-card-title">Stop Current Timer</span>
              <button onClick={() => setPendingStop(null)} className="swiftly-modal-close">&times;</button>
            </div>
            <div className="swiftly-modal-body" style={{ padding: 20 }}>
              <p style={{ fontSize: 13, color: 'var(--swiftly-text-secondary)', marginBottom: 12 }}>
                Stop timer for <strong>{activeTimer?.itemName}</strong> ({formatTimerDisplay(elapsed)}) and start tracking <strong>{pendingStop.name}</strong>?
              </p>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--swiftly-text-secondary)', display: 'block', marginBottom: 4 }}>
                  Notes (optional)
                </label>
                <input
                  type="text"
                  value={stopNote}
                  onChange={(e) => setStopNote(e.target.value)}
                  placeholder="What were you working on?"
                  style={{
                    width: '100%', padding: '8px 12px', fontSize: 13, border: '1px solid var(--swiftly-border)',
                    borderRadius: 6, outline: 'none', boxSizing: 'border-box',
                  }}
                  onKeyDown={(e) => { if (e.key === 'Enter') confirmStopAndSwitch(); }}
                  autoFocus
                />
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="swiftly-action-btn" onClick={() => setPendingStop(null)}>Cancel</button>
                <button
                  className="swiftly-action-btn"
                  onClick={confirmStopAndSwitch}
                  style={{ background: 'var(--swiftly-primary)', color: '#fff', border: 'none' }}
                >
                  Stop &amp; Switch
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Board Selector */}
      <div className="swiftly-card">
        <div className="swiftly-card-header">
          <span className="swiftly-card-title">Select Boards</span>
          <span style={{ fontSize: 13, color: 'var(--swiftly-text-secondary)' }}>
            {selectedBoardIds.length} selected
          </span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {boards.map((board) => (
            <button
              key={board.id}
              onClick={() => toggleBoard(String(board.id))}
              className={`swiftly-board-chip ${selectedBoardIds.includes(String(board.id)) ? 'swiftly-board-chip--selected' : ''}`}
            >
              {board.name}
            </button>
          ))}
        </div>
      </div>

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
      <BillableSummary logs={logs} />

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
      <TimeLogTable logs={logs} onToggleBillable={toggleBillable} onDeleteLog={deleteLog} />
    </div>
  );
}
