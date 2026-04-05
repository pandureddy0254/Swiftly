import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import * as api from '@core/api/swiftly-client';
import { useSwiftly } from '@core/state/useSwiftly';
import BoardSelector from '@core/components/BoardSelector';
import KanbanBoard from './KanbanBoard';
import BurndownChart from './BurndownChart';
import VelocityMetrics from './VelocityMetrics';
import SprintSummary from './SprintSummary';

// Constants
const COLUMN_COLORS = {
  done: '#00ca72',
  stuck: '#e2445c',
};

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
      const result = await fetchDashboardData(selectedBoardIds);
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
      return { items: [], columns: { backlog: [], todo: [], inProgress: [], done: [], stuck: [] }, stuck: [], totalPoints: 0, completedPoints: 0, boardName: '', hasStatusColumn: true };
    }

    const allItems = reportData.boards.flatMap((b) => (b.items || []).map((item) => ({
      ...item,
      column_values: item.column_values || [],
      group: item.group || { id: 'no_group', title: 'No Group' },
      subitems: item.subitems || [],
    })));
    const columns = { backlog: [], todo: [], inProgress: [], done: [], stuck: [] };
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

    // Store stuck items in columns for KanbanBoard
    columns.stuck = stuckItems;

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
        <BoardSelector />
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
          <VelocityMetrics
            totalPoints={sprintData.totalPoints}
            completedPoints={sprintData.completedPoints}
            totalCount={sprintData.totalCount}
            doneCount={sprintData.doneCount}
            velocity={velocity}
            progress={sprintData.progress}
            stuckCount={sprintData.stuck.length}
          />

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
            <KanbanBoard columns={sprintData.columns} />
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
