import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';
import * as api from '@core/api/swiftly-client';
import { useSwiftly } from '@core/state/useSwiftly';

// Constants
const COLUMN_COLORS = {
  backlog: '#c4c4c4',
  todo: '#579bfc',
  inProgress: '#0073ea',
  done: '#00ca72',
  stuck: '#e2445c',
};

const SPRINT_COLUMNS = [
  { key: 'backlog', label: 'Backlog', icon: '\u{1F4CB}' },
  { key: 'todo', label: 'To Do', icon: '\u{1F4DD}' },
  { key: 'inProgress', label: 'In Progress', icon: '\u{1F504}' },
  { key: 'done', label: 'Done', icon: '\u2705' },
];

/** Map Monday.com status labels to sprint column keys. */
function mapStatusToColumn(statusText) {
  if (!statusText || statusText.trim() === '') return 'backlog';
  const lower = statusText.toLowerCase().trim();

  if (lower === 'done' || lower === 'completed' || lower === 'closed') return 'done';
  if (lower === 'working on it' || lower === 'in progress') return 'inProgress';
  if (lower === 'stuck' || lower === 'blocked') return 'stuck';
  if (lower === 'to do') return 'todo';
  if (lower === 'not started') return 'backlog';

  return 'backlog';
}

/** Rough story-point estimate from Monday.com size labels. */
function estimatePoints(item) {
  const estCol = item.column_values?.find(
    (c) => c.type === 'numbers' || c.title?.toLowerCase().includes('point') || c.title?.toLowerCase().includes('estimate'),
  );
  if (estCol?.text && !isNaN(Number(estCol.text))) return Number(estCol.text);

  // Fallback: derive from t-shirt size columns
  const sizeCol = item.column_values?.find(
    (c) => c.title?.toLowerCase().includes('size') || c.title?.toLowerCase().includes('effort'),
  );
  const sizeMap = { xs: 1, s: 2, m: 3, l: 5, xl: 8 };
  if (sizeCol?.text) {
    const key = sizeCol.text.toLowerCase().trim();
    if (sizeMap[key]) return sizeMap[key];
  }

  return 0;
}

/** Extract status text from item column_values. */
function getStatusText(item) {
  const statusCol = item.column_values?.find((c) => c.type === 'status');
  return statusCol?.text || '';
}

/** Extract assignee name from item. */
function getAssignee(item) {
  const personCol = item.column_values?.find(
    (c) => c.type === 'people' || c.type === 'person',
  );
  if (personCol?.text) return personCol.text;
  return null;
}

/** Format a size label for display. */
function getEstimateLabel(item) {
  const pts = estimatePoints(item);
  if (pts > 0) return `${pts} pts`;
  const sizeCol = item.column_values?.find(
    (c) => c.title?.toLowerCase().includes('size') || c.title?.toLowerCase().includes('effort'),
  );
  if (sizeCol?.text) return `Est: ${sizeCol.text}`;
  return null;
}

// Toast
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

// Sprint Metric Card
function MetricCard({ label, value, color, subtitle }) {
  return (
    <div className="swiftly-card swiftly-stat">
      <div className="swiftly-stat-value" style={{ color: color || 'var(--swiftly-primary)' }}>
        {value}
      </div>
      <div className="swiftly-stat-label">{label}</div>
      {subtitle && (
        <div style={{ fontSize: 11, color: 'var(--swiftly-text-secondary)', marginTop: 2 }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}

// Item Card (Kanban)
function ItemCard({ item, isStuck }) {
  const assignee = getAssignee(item);
  const estimate = getEstimateLabel(item);
  const statusText = getStatusText(item);
  const cardStyle = {
    background: 'white', borderRadius: 'var(--swiftly-radius)', padding: '12px 14px', marginBottom: 8,
    border: `1px solid ${isStuck ? COLUMN_COLORS.stuck : 'var(--swiftly-border)'}`,
    borderLeft: isStuck ? `4px solid ${COLUMN_COLORS.stuck}` : undefined,
    transition: 'box-shadow 0.2s, transform 0.2s', cursor: 'default',
  };
  return (
    <div style={cardStyle}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = 'var(--swiftly-shadow-md)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}
    >
      <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--swiftly-text)', marginBottom: 6, lineHeight: 1.4 }}>
        {item.name}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        {isStuck && (
          <span style={{ fontSize: 10, fontWeight: 700, color: 'white', background: COLUMN_COLORS.stuck, padding: '1px 6px', borderRadius: 4, textTransform: 'uppercase' }}>
            {statusText}
          </span>
        )}
        {estimate && (
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--swiftly-text-secondary)', background: 'var(--swiftly-bg)', padding: '2px 8px', borderRadius: 4 }}>
            {estimate}
          </span>
        )}
        {assignee && (
          <span style={{ fontSize: 11, color: 'var(--swiftly-primary)', fontWeight: 500, marginLeft: 'auto', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {assignee}
          </span>
        )}
      </div>
    </div>
  );
}

// Kanban Column
function KanbanColumn({ column, items, stuckItems }) {
  const allItems = column.key === 'inProgress' ? [...items, ...stuckItems] : items;
  const color = COLUMN_COLORS[column.key];

  return (
    <div style={{ flex: 1, minWidth: 220, display: 'flex', flexDirection: 'column' }}>
      {/* Column header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
        background: `${color}12`, borderRadius: '8px 8px 0 0', borderBottom: `3px solid ${color}`,
      }}>
        <span style={{ fontSize: 16 }}>{column.icon}</span>
        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--swiftly-text)' }}>
          {column.label}
        </span>
        <span style={{
          marginLeft: 'auto', fontSize: 12, fontWeight: 600, color,
          background: `${color}20`, padding: '2px 8px', borderRadius: 10,
        }}>
          {allItems.length}
        </span>
      </div>

      {/* Column body */}
      <div style={{
        flex: 1, padding: 8, background: 'var(--swiftly-bg)', borderRadius: '0 0 8px 8px',
        minHeight: 120, maxHeight: 480, overflowY: 'auto',
      }}>
        {allItems.length === 0 && (
          <div style={{
            textAlign: 'center', padding: '24px 12px', color: 'var(--swiftly-text-secondary)',
            fontSize: 13, fontStyle: 'italic',
          }}>
            No items
          </div>
        )}
        {allItems.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            isStuck={stuckItems.includes(item)}
          />
        ))}
      </div>
    </div>
  );
}

// Burndown Chart
function BurndownChart({ totalItems, doneCount, sprintDays }) {
  const days = sprintDays > 0 ? sprintDays : 10;
  const today = Math.min(Math.max(1, Math.floor(days * 0.6)), days); // Simulate mid-sprint

  const data = useMemo(() => {
    const pts = [];
    const rate = doneCount / (today || 1);
    for (let d = 0; d <= days; d++) {
      const ideal = totalItems - (totalItems / days) * d;
      const actual = d <= today ? Math.max(0, totalItems - rate * d) : undefined;
      pts.push({ day: `Day ${d}`, Ideal: Math.round(ideal * 10) / 10, Actual: actual !== undefined ? Math.round(actual * 10) / 10 : undefined });
    }
    return pts;
  }, [totalItems, doneCount, days, today]);

  if (totalItems === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 40, color: 'var(--swiftly-text-secondary)', fontSize: 13 }}>
        No items to chart. Select a board with items to see the burndown.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--swiftly-border)" />
        <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="var(--swiftly-text-secondary)" />
        <YAxis tick={{ fontSize: 12 }} stroke="var(--swiftly-text-secondary)" />
        <Tooltip
          contentStyle={{
            borderRadius: 8, border: '1px solid var(--swiftly-border)',
            boxShadow: 'var(--swiftly-shadow-md)', fontSize: 13,
          }}
        />
        <Legend wrapperStyle={{ fontSize: 13 }} />
        <Line
          type="monotone"
          dataKey="Ideal"
          stroke="var(--swiftly-text-secondary)"
          strokeDasharray="6 3"
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="Actual"
          stroke={COLUMN_COLORS.inProgress}
          strokeWidth={2.5}
          dot={{ r: 3, fill: COLUMN_COLORS.inProgress }}
          connectNulls={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// Sprint Summary (AI-powered)
function SprintSummary({ token, boardIds, items }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fetchedRef = useRef(false);

  const fetchSummary = useCallback(async () => {
    if (!token || boardIds.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const question =
        'Provide a concise sprint summary. Include: overall progress assessment, key risks or blockers, ' +
        'items that need attention, and a recommended focus for the next few days. ' +
        'Format with bullet points and keep it under 200 words.';
      const result = await api.aiChat(token, question, boardIds);
      setSummary(result.response || result.message || result.answer || 'No summary available.');
    } catch (err) {
      setError(err.message || 'Failed to generate sprint summary.');
    } finally {
      setLoading(false);
    }
  }, [token, boardIds]);

  useEffect(() => {
    if (boardIds.length > 0 && items.length > 0 && !fetchedRef.current) {
      fetchedRef.current = true;
      fetchSummary();
    }
  }, [boardIds, items.length, fetchSummary]);

  // Reset when boards change
  useEffect(() => {
    fetchedRef.current = false;
    setSummary(null);
    setError(null);
  }, [boardIds]);

  return (
    <div className="swiftly-card">
      <div className="swiftly-card-header">
        <span className="swiftly-card-title">{'\u{1F916}'} AI Sprint Summary</span>
        <button
          className="swiftly-action-btn"
          onClick={() => { fetchedRef.current = false; fetchSummary(); }}
          disabled={loading}
          style={{ fontSize: 12, padding: '4px 12px' }}
        >
          {loading ? '\u23F3 Generating...' : '\u{1F504} Refresh'}
        </button>
      </div>

      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 20, color: 'var(--swiftly-text-secondary)' }}>
          <div className="swiftly-spinner" />
          Generating sprint summary...
        </div>
      )}

      {error && (
        <div style={{ color: 'var(--swiftly-danger)', fontSize: 13, padding: '8px 0' }}>
          {error}
        </div>
      )}

      {!loading && summary && (
        <div
          className="swiftly-ai-report-content"
          style={{ fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}
          dangerouslySetInnerHTML={{ __html: formatMarkdown(summary) }}
        />
      )}

      {!loading && !summary && !error && (
        <div style={{ color: 'var(--swiftly-text-secondary)', fontSize: 13, padding: '16px 0', textAlign: 'center' }}>
          Select a board to generate a sprint summary.
        </div>
      )}
    </div>
  );
}

/** Basic markdown to HTML. */
function formatMarkdown(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^### (.+)$/gm, '<h4>$1</h4>').replace(/^## (.+)$/gm, '<h3>$1</h3>')
    .replace(/^- (.+)$/gm, '\u2022 $1').replace(/\n/g, '<br />');
}

// Loading Skeleton
function SprintSkeleton() {
  const skel = (h) => <div className="swiftly-skeleton" style={{ height: h }} />;
  return (
    <div>
      <div className="swiftly-card">{skel(60)}<div className="swiftly-grid swiftly-grid-4" style={{ marginTop: 16 }}>{[1,2,3,4].map(i => <div key={i}>{skel(80)}</div>)}</div></div>
      <div className="swiftly-card">{skel(280)}</div>
      <div className="swiftly-grid swiftly-grid-4">{[1,2,3,4].map(i => <div key={i}>{skel(300)}</div>)}</div>
    </div>
  );
}

// Main SprintView Component
function SprintView() {
  const {
    token,
    boards,
    selectedBoardIds,
    toggleBoard,
    fetchDashboardData,
  } = useSwiftly();

  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [error, setError] = useState(null);
  const loadRef = useRef(0);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
  }, []);

  // Auto-load sprint data when boards change
  useEffect(() => {
    if (selectedBoardIds.length > 0) {
      loadSprintData();
    } else {
      setReportData(null);
    }
  }, [selectedBoardIds]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadSprintData() {
    const loadId = ++loadRef.current;
    setLoading(true);
    setError(null);

    try {
      // Use the shared context fetch which has caching
      const result = await fetchDashboardData();
      if (loadId !== loadRef.current) return;

      if (result && result.reportData) {
        setReportData(result.reportData);
      } else {
        // Fallback: direct API call if context fetch returns null
        const reportResult = await api.generateReport(token, selectedBoardIds, {
          tone: 'professional',
          audience: 'developer',
          includeRecommendations: false,
        });
        if (loadId !== loadRef.current) return;
        setReportData(reportResult.data);
      }
    } catch (err) {
      if (loadId !== loadRef.current) return;
      setError(err.message || 'Failed to load sprint data.');
    } finally {
      if (loadId === loadRef.current) setLoading(false);
    }
  }

    // Derived sprint data
    const sprintData = useMemo(() => {
    if (!reportData?.boards) {
      return { items: [], columns: { backlog: [], todo: [], inProgress: [], done: [] }, stuck: [], totalPoints: 0, completedPoints: 0, boardName: '', hasStatusColumn: true };
    }

    const allItems = reportData.boards.flatMap((b) => (b.items || []).map((item) => ({
      ...item,
      column_values: item.column_values || [],
      group: item.group || { id: 'no_group', title: 'No Group' },
      subitems: item.subitems || [],
    })));
    const columns = { backlog: [], todo: [], inProgress: [], done: [] };
    const stuckItems = [];
    let totalPoints = 0;
    let completedPoints = 0;

    // Detect if ANY item has a status column
    const hasStatusColumn = allItems.some((item) =>
      (item.column_values || []).some((c) => c.type === 'status')
    );

    allItems.forEach((item) => {
      const statusText = getStatusText(item);
      const col = mapStatusToColumn(statusText);
      const pts = estimatePoints(item);
      totalPoints += pts;

      if (col === 'stuck') {
        stuckItems.push(item);
        // Stuck items show in "In Progress" visually
      } else if (columns[col]) {
        columns[col].push(item);
      } else {
        columns.backlog.push(item);
      }

      if (col === 'done') {
        completedPoints += pts;
      }
    });

    const doneCount = columns.done.length;
    const totalCount = allItems.length;
    const progress = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

    // Derive board name for header
    const boardName = reportData.boards.length === 1
      ? (reportData.boards[0].name || reportData.boards[0].boardName || `Board ${reportData.boards[0].id}`)
      : `${reportData.boards.length} Boards`;

    return {
      items: allItems,
      columns,
      stuck: stuckItems,
      totalPoints,
      completedPoints,
      doneCount,
      totalCount,
      progress,
      boardName,
      hasStatusColumn,
    };
  }, [reportData]);

  const velocity = sprintData.doneCount > 0
    ? `${sprintData.completedPoints > 0 ? sprintData.completedPoints : sprintData.doneCount} items`
    : '\u2014';

    // Render
    if (boards.length === 0 && !error) {
    return (
      <div className="swiftly-loading">
        <div className="swiftly-spinner" />
        Loading boards...
      </div>
    );
  }

  return (
    <div>
      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Board Selector */}
      <div className="swiftly-card">
        <div className="swiftly-card-header">
          <span className="swiftly-card-title">{'\u{1F3C3}'} Sprint Management</span>
          <span style={{ fontSize: 13, color: 'var(--swiftly-text-secondary)' }}>
            {selectedBoardIds.length} board{selectedBoardIds.length !== 1 ? 's' : ''} selected
            {loading && <span style={{ marginLeft: 8 }}>&middot; Loading...</span>}
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
          {boards.length === 0 && (
            <span style={{ fontSize: 13, color: 'var(--swiftly-text-secondary)' }}>No boards available</span>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="swiftly-card" style={{ borderLeft: '4px solid var(--swiftly-danger)' }}>
          <p style={{ color: 'var(--swiftly-danger)', fontSize: 14 }}>{error}</p>
          <button className="swiftly-action-btn" style={{ marginTop: 8 }} onClick={() => loadSprintData()}>
            Retry
          </button>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && <SprintSkeleton />}

      {/* Empty state */}
      {!loading && !reportData && selectedBoardIds.length === 0 && (
        <div className="swiftly-empty">
          <h3>{'\u{1F3AF}'} Select a board to begin</h3>
          <p>Choose one or more boards above to view sprint data.</p>
        </div>
      )}

      {/* Sprint Content */}
      {!loading && reportData && (
        <>
          {/* Sprint Header Bar */}
          <div className="swiftly-command-bar" style={{ marginBottom: 20 }}>
            <div>
              <h2 style={{ margin: 0 }}>Sprint: {sprintData.boardName}</h2>
              <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>
                {sprintData.totalCount} items &middot; {sprintData.doneCount} completed
                &middot; Velocity: {velocity} &middot; Days remaining: &mdash;
              </div>
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{
                fontSize: 28, fontWeight: 800,
                color: sprintData.progress >= 75 ? '#a5f3c8' : sprintData.progress >= 40 ? '#fde68a' : 'rgba(255,255,255,0.9)',
              }}>
                {sprintData.progress}%
              </div>
              <div style={{ width: 120, height: 8, background: 'rgba(255,255,255,0.2)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{
                  width: `${sprintData.progress}%`, height: '100%', borderRadius: 4,
                  background: sprintData.progress >= 75 ? COLUMN_COLORS.done : sprintData.progress >= 40 ? '#fdab3d' : 'rgba(255,255,255,0.6)',
                  transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                }} />
              </div>
            </div>
          </div>

          {/* Sprint Metrics */}
          <div className="swiftly-grid swiftly-grid-4" style={{ marginBottom: 16 }}>
            <MetricCard
              label="Total Story Points"
              value={sprintData.totalPoints || '\u2014'}
              color="var(--swiftly-primary)"
              subtitle={`Across ${sprintData.totalCount} items`}
            />
            <MetricCard
              label="Completed Points"
              value={sprintData.completedPoints || 0}
              color={COLUMN_COLORS.done}
              subtitle={`${sprintData.doneCount} items done`}
            />
            <MetricCard
              label="Velocity"
              value={velocity}
              color={COLUMN_COLORS.inProgress}
              subtitle="Items completed"
            />
            <MetricCard
              label="Sprint Progress"
              value={`${sprintData.progress}%`}
              color={sprintData.progress >= 75 ? COLUMN_COLORS.done : sprintData.progress >= 40 ? '#fdab3d' : 'var(--swiftly-danger)'}
              subtitle={sprintData.stuck.length > 0 ? `${sprintData.stuck.length} blocked` : 'On track'}
            />
          </div>

          {/* Burndown Chart */}
          <div className="swiftly-card" style={{ marginBottom: 16 }}>
            <div className="swiftly-card-header">
              <span className="swiftly-card-title">{'\u{1F4C9}'} Burndown Chart</span>
              <span style={{ fontSize: 12, color: 'var(--swiftly-text-secondary)' }}>
                Ideal vs Actual progress
              </span>
            </div>
            <BurndownChart
              totalItems={sprintData.totalCount}
              doneCount={sprintData.doneCount}
              sprintDays={14}
            />
          </div>

          {/* No Status Column Warning */}
          {!sprintData.hasStatusColumn && sprintData.totalCount > 0 && (
            <div className="swiftly-card" style={{ borderLeft: '4px solid var(--swiftly-warning)', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' }}>
                <span style={{ fontSize: 20 }}>{'\u26A0\uFE0F'}</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--swiftly-text)' }}>
                    Add a Status column to your board for sprint tracking
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--swiftly-text-secondary)', marginTop: 2 }}>
                    Without a Status column, all items appear in Backlog. Add a Status column in monday.com to enable kanban tracking.
                  </div>
                </div>
              </div>
              {/* Show all items in a simple list */}
              <div style={{ marginTop: 12, maxHeight: 300, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--swiftly-border)' }}>
                      <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--swiftly-text-secondary)', fontWeight: 500 }}>Item</th>
                      <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--swiftly-text-secondary)', fontWeight: 500 }}>Group</th>
                      <th style={{ textAlign: 'center', padding: '8px 12px', color: 'var(--swiftly-text-secondary)', fontWeight: 500 }}>Estimate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sprintData.items.map((item) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid var(--swiftly-border)' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 500 }}>{item.name}</td>
                        <td style={{ padding: '8px 12px', color: 'var(--swiftly-text-secondary)' }}>{item.group?.title || 'No Group'}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'center' }}>{getEstimateLabel(item) || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Kanban Board */}
          <div className="swiftly-card" style={{ padding: 16, marginBottom: 16 }}>
            <div className="swiftly-card-header" style={{ marginBottom: 12 }}>
              <span className="swiftly-card-title">{'\u{1F4CB}'} Sprint Board</span>
              <span style={{ fontSize: 12, color: 'var(--swiftly-text-secondary)' }}>
                {sprintData.totalCount} total items
                {sprintData.stuck.length > 0 && (
                  <span style={{ color: COLUMN_COLORS.stuck, fontWeight: 600, marginLeft: 8 }}>
                    {'\u26A0\uFE0F'} {sprintData.stuck.length} blocked
                  </span>
                )}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4 }}>
              {SPRINT_COLUMNS.map((col) => (
                <KanbanColumn
                  key={col.key}
                  column={col}
                  items={sprintData.columns[col.key] || []}
                  stuckItems={col.key === 'inProgress' ? sprintData.stuck : []}
                />
              ))}
            </div>
          </div>

          {/* AI Sprint Summary */}
          <SprintSummary
            token={token}
            boardIds={selectedBoardIds}
            items={sprintData.items}
          />
        </>
      )}
    </div>
  );
}

export default SprintView;
