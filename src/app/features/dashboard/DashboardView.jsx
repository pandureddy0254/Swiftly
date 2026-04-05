import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import * as api from '@core/api/swiftly-client';
import { useSwiftly } from '@core/state/useSwiftly';
import BoardSelector from '@core/components/BoardSelector';
import Toast from '@core/components/Toast';
import HealthGauge, { scoreColor } from './HealthGauge';
import DashboardSkeleton from './DashboardSkeleton';
import SuggestionCards from './SuggestionCards';
import BoardOverviewCards from './BoardOverviewCards';
import ActivityTimeline from './ActivityTimeline';
import QuickActions from './QuickActions';
import {
  STALE_DAYS,
  daysSince,
  resolveBoardName,
  calculateHealthScore,
  generateSuggestions,
} from './dashboardUtils';

// ---------------------------------------------------------------------------
// Main DashboardView Component
// ---------------------------------------------------------------------------
function DashboardView() {
  const {
    token,
    boards,
    boardsLoaded,
    selectedBoardIds,
    setSelectedBoardIds,
    toggleBoard,
    reportData: ctxReportData,
    insights: ctxInsights,
    loading: ctxLoading,
    error: ctxError,
    fetchDashboardData,
    fetchBoardItems,
    invalidateCache,
    invalidateBoardItems,
  } = useSwiftly();

  const [reportData, setReportData] = useState(null);
  const [aiInsightsData, setAiInsightsData] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [healthScore, setHealthScore] = useState(0);
  const [healthBreakdown, setHealthBreakdown] = useState([]);
  const [boardItems, setBoardItems] = useState({});
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [error, setError] = useState(null);
  const loadRef = useRef(0);
  const autoSelectedRef = useRef(false);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
  }, []);

  // Auto-select boards on first load if none selected
  useEffect(() => {
    if (boards.length > 0 && selectedBoardIds.length === 0 && !autoSelectedRef.current) {
      autoSelectedRef.current = true;
      const eligible = boards.filter((b) => {
        const name = (b.name || '').toLowerCase();
        if (name.includes('swiftly')) return false;
        if (name.startsWith('subitems of')) return false;
        if (name.includes('welcome to your')) return false;
        if (b.items_count === 0 && b.totalItems === 0) return false;
        return true;
      });
      if (eligible.length > 0) {
        setSelectedBoardIds(eligible.map((b) => String(b.id)));
      }
    }
  }, [boards, selectedBoardIds.length, setSelectedBoardIds]);

  // Auto-load dashboard when boards are selected
  useEffect(() => {
    if (selectedBoardIds.length > 0) {
      loadDashboard();
    } else {
      setReportData(null);
      setAiInsightsData([]);
      setSuggestions([]);
      setHealthScore(0);
      setHealthBreakdown([]);
      setBoardItems({});
    }
  }, [selectedBoardIds]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadDashboard() {
    const loadId = ++loadRef.current;
    setLoading(true);
    setError(null);

    try {
      const result = await fetchDashboardData(selectedBoardIds);

      if (loadId !== loadRef.current) return;

      if (!result || !result.reportData) {
        setError(ctxError || 'Failed to load report data. Please try again.');
        setLoading(false);
        return;
      }

      const reportResult = result.reportData;

      if (reportResult?.boards) {
        reportResult.boards = reportResult.boards.map((b) => ({
          ...b,
          name: resolveBoardName(b),
        }));
      }

      setReportData(reportResult);
      setAiInsightsData(result.insights || []);

      const itemsMap = {};
      const itemFetches = selectedBoardIds.map(async (bid) => {
        try {
          const items = await fetchBoardItems(bid);
          const boardMeta = reportResult?.boards?.find((b) => String(b.id) === String(bid));
          const boardName = boardMeta ? resolveBoardName(boardMeta) : (boards.find((b) => String(b.id) === String(bid))?.name || `Board ${bid}`);
          itemsMap[bid] = (items || []).map((it) => ({
            ...it,
            _boardId: bid,
            _boardName: boardName,
          }));
        } catch {
          itemsMap[bid] = [];
        }
      });
      await Promise.all(itemFetches);

      if (loadId !== loadRef.current) return;

      setBoardItems(itemsMap);

      const allItems = Object.values(itemsMap).flat();

      const { score, breakdown } = calculateHealthScore(reportResult, allItems);
      setHealthScore(score);
      setHealthBreakdown(breakdown);

      const ruleSuggestions = generateSuggestions(reportResult, allItems, itemsMap);

      const reportInsights = result.report?.insights || result.insights || [];
      const aiSuggestions = (Array.isArray(reportInsights) ? reportInsights : []).map((ins) => {
        const insBoardName = ins.board && ins.board !== 'Unknown'
          ? ins.board
          : ins.boardId
            ? resolveBoardName(reportResult?.boards?.find((b) => String(b.id) === String(ins.boardId)) || {})
            : null;
        return {
          id: `ai-${ins.title}`,
          title: ins.title,
          description: ins.description,
          severity: ins.severity === 'high' ? 'critical' : ins.severity === 'medium' ? 'warning' : 'info',
          board: insBoardName,
          actions: ins.boardId ? [
            {
              key: `ai-action-${ins.boardId}-${ins.title}`,
              label: 'Create Action Plan',
              icon: '\uD83D\uDCCB',
              handler: async (tkn) => {
                await api.createItem(tkn, ins.boardId, `[Action Plan] ${ins.title}`, {}, null);
                invalidateCache();
              },
            },
            {
              key: `ai-view-${ins.boardId}`,
              label: 'View Board Items',
              icon: '\uD83D\uDD0D',
              handler: async () => {},
            },
          ] : [],
        };
      });

      setSuggestions([...ruleSuggestions, ...aiSuggestions]);
    } catch (err) {
      if (loadId === loadRef.current) {
        setError(err.message);
      }
    } finally {
      if (loadId === loadRef.current) {
        setLoading(false);
      }
    }
  }

  // Derived data
  const allItems = Object.values(boardItems).flat();
  const atRiskCount = allItems.filter((it) => {
    const s = it.column_values?.find((c) => c.type === 'status');
    return s?.text === 'Stuck' || daysSince(it.updated_at) > STALE_DAYS;
  }).length;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  if (!boardsLoaded && boards.length === 0 && !error) {
    return (
      <div className="swiftly-loading">
        <div className="swiftly-spinner" />
        Loading boards...
      </div>
    );
  }

  if (boardsLoaded && boards.length === 0 && !error) {
    return (
      <div className="swiftly-empty">
        <h3>No boards found</h3>
        <p>Create a board in Monday.com to get started.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Board Selector */}
      <BoardSelector
        label="Command Center"
        showCount={true}
        subtitle={loading ? '\u00b7 Analyzing...' : undefined}
      />

      {/* Error */}
      {error && (
        <div className="swiftly-card" style={{ borderLeft: '4px solid var(--swiftly-danger)' }}>
          <p style={{ color: 'var(--swiftly-danger)', fontSize: 14 }}>{error}</p>
          <button className="swiftly-action-btn" style={{ marginTop: 8 }} onClick={() => loadDashboard()}>
            Retry
          </button>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && <DashboardSkeleton />}

      {/* Dashboard Content */}
      {!loading && reportData && (
        <>
          {/* Health Gauge + KPI Row */}
          <div className="swiftly-grid swiftly-grid-2" style={{ alignItems: 'stretch' }}>
            {/* Health Gauge Card */}
            <div className="swiftly-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <HealthGauge score={healthScore} breakdown={healthBreakdown} />
            </div>

            {/* Quick Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="swiftly-card swiftly-stat">
                <div className="swiftly-stat-value">{reportData.totalItems}</div>
                <div className="swiftly-stat-label">Total Items</div>
              </div>
              <div className="swiftly-card swiftly-stat">
                <div className="swiftly-stat-value" style={{ color: 'var(--swiftly-success)' }}>
                  {reportData.completedItems || 0}
                </div>
                <div className="swiftly-stat-label">Completed</div>
              </div>
              <div className="swiftly-card swiftly-stat">
                <div className="swiftly-stat-value" style={{ color: 'var(--swiftly-danger)' }}>
                  {atRiskCount}
                </div>
                <div className="swiftly-stat-label">At Risk</div>
              </div>
              <div className="swiftly-card swiftly-stat">
                <div className="swiftly-stat-value" style={{ color: scoreColor(healthScore) }}>
                  {healthScore}
                </div>
                <div className="swiftly-stat-label">Health Score</div>
              </div>
            </div>
          </div>

          {/* Smart Suggestions */}
          <SuggestionCards
            suggestions={suggestions}
            onAction={{ token, showToast }}
            loading={loading}
          />

          {/* Quick Actions */}
          <QuickActions
            token={token}
            selectedBoardIds={selectedBoardIds}
            onAction={loadDashboard}
            showToast={showToast}
          />

          {/* Status Distribution (compact pie) */}
          {reportData.statusBreakdown && Object.keys(reportData.statusBreakdown).length > 0 && (
            <div className="swiftly-card">
              <div className="swiftly-card-header">
                <span className="swiftly-card-title">Status Distribution</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
                <ResponsiveContainer width={180} height={180}>
                  <PieChart>
                    <Pie
                      data={Object.entries(reportData.statusBreakdown).map(([name, value]) => ({ name, value }))}
                      cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value"
                    >
                      {Object.keys(reportData.statusBreakdown).map((_, i) => (
                        <Cell key={i} fill={['#0073ea', '#00ca72', '#fdab3d', '#e2445c', '#579bfc', '#a25ddc', '#037f4c', '#ff5ac4'][i % 8]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {Object.entries(reportData.statusBreakdown).map(([name, count], i) => (
                    <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                      <div style={{
                        width: 10, height: 10, borderRadius: 2, flexShrink: 0,
                        background: ['#0073ea', '#00ca72', '#fdab3d', '#e2445c', '#579bfc', '#a25ddc', '#037f4c', '#ff5ac4'][i % 8],
                      }} />
                      <span style={{ color: 'var(--swiftly-text-secondary)' }}>{name}</span>
                      <span style={{ fontWeight: 600, marginLeft: 'auto' }}>{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Board Overview Cards */}
          <BoardOverviewCards
            boards={reportData.boards}
            onRefresh={loadDashboard}
            boardItems={boardItems}
            token={token}
            showToast={showToast}
          />

          {/* Activity Timeline */}
          {allItems.length > 0 && <ActivityTimeline items={allItems} />}
        </>
      )}

      {/* Empty state */}
      {!loading && !reportData && selectedBoardIds.length === 0 && (
        <div className="swiftly-empty">
          <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }}>
            <svg width="48" height="48" viewBox="0 0 28 28" fill="none">
              <rect width="28" height="28" rx="6" fill="#0073ea" />
              <path d="M8 18L13 8L18 14L22 10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="22" cy="10" r="2" fill="white" />
            </svg>
          </div>
          <h3>Select boards to activate the Command Center</h3>
          <p>Choose one or more boards above. The dashboard will auto-analyze your data and provide actionable insights.</p>
        </div>
      )}
    </div>
  );
}

export default DashboardView;
