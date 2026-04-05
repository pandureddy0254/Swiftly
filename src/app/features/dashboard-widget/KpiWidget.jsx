import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { useMonday } from '@core/hooks/useMonday';
import * as api from '@core/api/swiftly-client';

const COLORS = {
  success: '#00ca72',
  warning: '#fdab3d',
  danger: '#e2445c',
  primary: '#0073ea',
  info: '#579bfc',
  purple: '#a25ddc',
};

const STATUS_COLORS = {
  'Done': COLORS.success,
  'Completed': COLORS.success,
  'Closed': COLORS.success,
  'Working on it': COLORS.primary,
  'In Progress': COLORS.primary,
  'Stuck': COLORS.danger,
  'Blocked': COLORS.danger,
  'Not Started': '#c4c4c4',
  'default': COLORS.info,
};

function getStatusColor(status) {
  return STATUS_COLORS[status] || STATUS_COLORS.default;
}

function getProgressColor(pct) {
  if (pct >= 75) return COLORS.success;
  if (pct >= 40) return COLORS.warning;
  return COLORS.danger;
}

/**
 * Swiftly KPI Dashboard Widget
 * Shows at-a-glance metrics for the connected board(s).
 * Designed to be compact and fit in monday.com dashboard widgets.
 */
function KpiWidget() {
  const { token, isReady, settings } = useMonday();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const boardIds = settings?.boardIds
    ? (Array.isArray(settings.boardIds) ? settings.boardIds : [settings.boardIds])
    : [];

  useEffect(() => {
    if (!isReady || !token || boardIds.length === 0) {
      setLoading(false);
      return;
    }

    async function loadData() {
      setLoading(true);
      try {
        const result = await api.generateReport(token, boardIds.map(String));
        setData(result.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadData();
    // Refresh every 5 minutes
    const interval = setInterval(loadData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [isReady, token, boardIds.join(',')]);

  if (!isReady || loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingContainer}>
          <div className="swiftly-spinner" />
          <span style={styles.loadingText}>Loading metrics...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.errorContainer}>
          <span style={styles.errorText}>{error}</span>
        </div>
      </div>
    );
  }

  if (!data || boardIds.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.emptyContainer}>
          <svg width="40" height="40" viewBox="0 0 28 28" fill="none">
            <rect width="28" height="28" rx="6" fill="#0073ea" />
            <path d="M8 18L13 8L18 14L22 10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="22" cy="10" r="2" fill="white" />
          </svg>
          <p style={styles.emptyTitle}>Swiftly KPIs</p>
          <p style={styles.emptyText}>Configure board IDs in widget settings to see metrics.</p>
        </div>
      </div>
    );
  }

  const statusData = Object.entries(data.statusBreakdown).map(([name, value]) => ({
    name,
    value,
    color: getStatusColor(name),
  }));

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <svg width="18" height="18" viewBox="0 0 28 28" fill="none">
            <rect width="28" height="28" rx="6" fill="#0073ea" />
            <path d="M8 18L13 8L18 14L22 10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="22" cy="10" r="2" fill="white" />
          </svg>
          <span style={styles.headerTitle}>Swiftly</span>
        </div>
        <span style={styles.headerBadge}>{data.totalBoards} board{data.totalBoards > 1 ? 's' : ''}</span>
      </div>

      {/* Progress Ring + KPIs */}
      <div style={styles.metricsRow}>
        {/* Circular progress */}
        <div style={styles.progressRing}>
          <ResponsiveContainer width={120} height={120}>
            <PieChart>
              <Pie
                data={[
                  { value: data.overallProgress },
                  { value: 100 - data.overallProgress },
                ]}
                cx="50%"
                cy="50%"
                innerRadius={38}
                outerRadius={50}
                startAngle={90}
                endAngle={-270}
                dataKey="value"
                stroke="none"
              >
                <Cell fill={getProgressColor(data.overallProgress)} />
                <Cell fill="#e6e9ef" />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div style={styles.progressLabel}>
            <span style={{ ...styles.progressValue, color: getProgressColor(data.overallProgress) }}>
              {data.overallProgress}%
            </span>
            <span style={styles.progressText}>Complete</span>
          </div>
        </div>

        {/* KPI Numbers */}
        <div style={styles.kpiGrid}>
          <div style={styles.kpiItem}>
            <span style={styles.kpiValue}>{data.totalItems}</span>
            <span style={styles.kpiLabel}>Items</span>
          </div>
          <div style={styles.kpiItem}>
            <span style={{ ...styles.kpiValue, color: COLORS.success }}>{data.completedItems}</span>
            <span style={styles.kpiLabel}>Done</span>
          </div>
          <div style={styles.kpiItem}>
            <span style={styles.kpiValue}>{data.totalSubitems}</span>
            <span style={styles.kpiLabel}>Subitems</span>
          </div>
          <div style={styles.kpiItem}>
            <span style={{ ...styles.kpiValue, color: COLORS.warning }}>
              {data.totalItems - data.completedItems}
            </span>
            <span style={styles.kpiLabel}>Remaining</span>
          </div>
        </div>
      </div>

      {/* Status breakdown mini-bars */}
      <div style={styles.statusSection}>
        <span style={styles.sectionTitle}>Status Distribution</span>
        <div style={styles.statusBars}>
          {statusData.slice(0, 6).map((item) => (
            <div key={item.name} style={styles.statusRow}>
              <div style={styles.statusInfo}>
                <span style={{ ...styles.statusDot, backgroundColor: item.color }} />
                <span style={styles.statusName}>{item.name}</span>
              </div>
              <div style={styles.statusBarContainer}>
                <div
                  style={{
                    ...styles.statusBarFill,
                    width: `${(item.value / data.totalItems) * 100}%`,
                    backgroundColor: item.color,
                  }}
                />
              </div>
              <span style={styles.statusCount}>{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Board progress mini-list */}
      {data.boards.length > 1 && (
        <div style={styles.boardSection}>
          <span style={styles.sectionTitle}>Boards</span>
          {data.boards.map((board) => {
            const bName = board.name || board.boardName || `Board ${board.id}`;
            return (
            <div key={board.id} style={styles.boardRow}>
              <span style={styles.boardName}>
                {bName.length > 25 ? bName.slice(0, 25) + '...' : bName}
              </span>
              <div style={styles.boardProgress}>
                <div style={styles.boardProgressBar}>
                  <div
                    style={{
                      ...styles.boardProgressFill,
                      width: `${board.progress}%`,
                      backgroundColor: getProgressColor(board.progress),
                    }}
                  />
                </div>
                <span style={{ ...styles.boardPct, color: getProgressColor(board.progress) }}>
                  {board.progress}%
                </span>
              </div>
            </div>
          );
          })}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: 16,
    fontFamily: 'Figtree, Roboto, sans-serif',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: '#323338',
  },
  headerBadge: {
    fontSize: 11,
    color: '#676879',
    background: '#f6f7fb',
    padding: '2px 8px',
    borderRadius: 10,
  },
  metricsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 20,
    marginBottom: 20,
  },
  progressRing: {
    position: 'relative',
    width: 120,
    height: 120,
    flexShrink: 0,
  },
  progressLabel: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    textAlign: 'center',
  },
  progressValue: {
    fontSize: 22,
    fontWeight: 700,
    display: 'block',
    lineHeight: 1.1,
  },
  progressText: {
    fontSize: 10,
    color: '#676879',
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
    flex: 1,
  },
  kpiItem: {
    textAlign: 'center',
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: 700,
    color: '#323338',
    display: 'block',
    lineHeight: 1.2,
  },
  kpiLabel: {
    fontSize: 11,
    color: '#676879',
  },
  statusSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: '#676879',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    display: 'block',
    marginBottom: 10,
  },
  statusBars: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  statusRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  statusInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    width: 100,
    flexShrink: 0,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    flexShrink: 0,
  },
  statusName: {
    fontSize: 12,
    color: '#323338',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  statusBarContainer: {
    flex: 1,
    height: 6,
    background: '#e6e9ef',
    borderRadius: 3,
    overflow: 'hidden',
  },
  statusBarFill: {
    height: '100%',
    borderRadius: 3,
    transition: 'width 0.6s ease',
  },
  statusCount: {
    fontSize: 12,
    fontWeight: 600,
    color: '#323338',
    width: 30,
    textAlign: 'right',
    flexShrink: 0,
  },
  boardSection: {
    marginTop: 4,
  },
  boardRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '6px 0',
  },
  boardName: {
    fontSize: 12,
    color: '#323338',
    flex: 1,
  },
  boardProgress: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    width: 140,
  },
  boardProgressBar: {
    flex: 1,
    height: 5,
    background: '#e6e9ef',
    borderRadius: 3,
    overflow: 'hidden',
  },
  boardProgressFill: {
    height: '100%',
    borderRadius: 3,
    transition: 'width 0.6s ease',
  },
  boardPct: {
    fontSize: 12,
    fontWeight: 600,
    width: 32,
    textAlign: 'right',
  },
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    height: '100%',
    minHeight: 200,
  },
  loadingText: {
    fontSize: 13,
    color: '#676879',
  },
  errorContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    minHeight: 200,
    padding: 20,
  },
  errorText: {
    fontSize: 13,
    color: '#e2445c',
    textAlign: 'center',
  },
  emptyContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    minHeight: 200,
    gap: 8,
    padding: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: '#323338',
    margin: 0,
  },
  emptyText: {
    fontSize: 13,
    color: '#676879',
    textAlign: 'center',
    margin: 0,
  },
};

export default KpiWidget;
