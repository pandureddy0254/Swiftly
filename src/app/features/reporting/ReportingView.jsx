import React, { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';
import * as api from '@core/api/swiftly-client';
import { useSwiftly } from '@core/state/useSwiftly';

const CHART_COLORS = ['#0073ea', '#00ca72', '#fdab3d', '#e2445c', '#579bfc', '#a25ddc', '#037f4c', '#ff5ac4'];

function Toast({ message, type, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3500);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`swiftly-toast swiftly-toast--${type}`}>
      {type === 'success' ? '\u2705' : '\u274C'} {message}
    </div>
  );
}

function InsightActionButton({ label, icon, onClick, loading, done }) {
  return (
    <button
      className={`swiftly-action-btn ${done ? 'swiftly-action-btn--done' : ''}`}
      onClick={onClick}
      disabled={loading || done}
      style={{ fontSize: 12, padding: '5px 12px' }}
    >
      <span>{done ? '\u2705' : loading ? '\u23F3' : icon}</span> {label}
    </button>
  );
}

/**
 * Modal to display items from a board inline.
 */
function ItemsModal({ items, boardName, onClose }) {
  return (
    <div className="swiftly-modal-overlay" onClick={onClose}>
      <div className="swiftly-modal" onClick={(e) => e.stopPropagation()}>
        <div className="swiftly-modal-header">
          <span className="swiftly-card-title">Items: {boardName}</span>
          <button onClick={onClose} className="swiftly-modal-close">&times;</button>
        </div>
        <div className="swiftly-modal-body">
          {items.length === 0 ? (
            <p style={{ color: 'var(--swiftly-text-secondary)', textAlign: 'center', padding: 20 }}>No items found.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--swiftly-border)' }}>
                  <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--swiftly-text-secondary)', fontWeight: 500 }}>Item</th>
                  <th style={{ textAlign: 'center', padding: '8px 12px', color: 'var(--swiftly-text-secondary)', fontWeight: 500 }}>Status</th>
                  <th style={{ textAlign: 'center', padding: '8px 12px', color: 'var(--swiftly-text-secondary)', fontWeight: 500 }}>Group</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const statusCol = item.column_values?.find((c) => c.type === 'status');
                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--swiftly-border)' }}>
                      <td style={{ padding: '8px 12px', fontWeight: 500 }}>{item.name}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>{statusCol?.text || '-'}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>{item.group?.title || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function InsightActions({ insight, token, onToast }) {
  const [actionStates, setActionStates] = useState({});
  const [viewItems, setViewItems] = useState(null);

  const setActionState = (key, state) => {
    setActionStates((prev) => ({ ...prev, [key]: state }));
  };

  const handleViewItems = async () => {
    setActionState('view', 'loading');
    try {
      if (insight.boardId) {
        const result = await api.getBoardItems(token, insight.boardId);
        setViewItems(result.items || []);
        setActionState('view', 'done');
        onToast?.(`Loaded ${(result.items || []).length} items from board`, 'success');
      } else {
        onToast?.('This insight is not linked to a specific board. Try generating a new report to link insights to boards.', 'error');
        setActionState('view', null);
      }
    } catch (err) {
      setActionState('view', null);
      onToast?.('Failed to load items: ' + err.message, 'error');
    }
  };

  const handleCreateActionPlan = async () => {
    setActionState('plan', 'loading');
    try {
      if (!insight.boardId) {
        onToast?.('Cannot create action plan: this insight is not linked to a specific board. The AI generated this as a general observation.', 'error');
        setActionState('plan', null);
        return;
      }
      const itemName = `[Action Plan] ${insight.title}`;
      const result = await api.createItem(token, insight.boardId, itemName, {}, null);
      setActionState('plan', 'done');
      onToast?.(`Action plan item created on board (ID: ${result.id})`, 'success');
    } catch (err) {
      setActionState('plan', null);
      onToast?.('Failed to create action plan: ' + err.message, 'error');
    }
  };

  const handleSendReminder = async () => {
    setActionState('reminder', 'loading');
    try {
      if (!insight.boardId) {
        onToast?.('Cannot send reminder: this insight is not linked to a specific board. Reminders require a board context to notify the right people.', 'error');
        setActionState('reminder', null);
        return;
      }
      // Create a notification item on the board as a reminder
      const itemName = `[Reminder] ${insight.title} - Action needed`;
      const result = await api.createItem(token, insight.boardId, itemName, {}, null);
      setActionState('reminder', 'done');
      onToast?.(`Reminder item created on board (ID: ${result.id}). Board subscribers will be notified.`, 'success');
    } catch (err) {
      setActionState('reminder', null);
      onToast?.('Failed to send reminder: ' + err.message, 'error');
    }
  };

  const handleUpdatePriorities = async () => {
    setActionState('priorities', 'loading');
    try {
      if (!insight.boardId) {
        onToast?.('Cannot update priorities: this insight is not linked to a specific board. Generate a new report to get board-specific recommendations.', 'error');
        setActionState('priorities', null);
        return;
      }
      // Create a priority review task on the board
      const itemName = `[Priority Review] ${insight.title}`;
      const result = await api.createItem(token, insight.boardId, itemName, {}, null);
      setActionState('priorities', 'done');
      onToast?.(`Priority review item created on board (ID: ${result.id}). Review and reassign priorities as needed.`, 'success');
    } catch (err) {
      setActionState('priorities', null);
      onToast?.('Failed to update priorities: ' + err.message, 'error');
    }
  };

  const actionsContent = (() => {
    if (insight.type === 'risk') {
      return (
        <div className="swiftly-action-buttons" style={{ marginTop: 10, paddingTop: 10 }}>
          <InsightActionButton
            label="View Items"
            icon={"\u{1F50D}"}
            onClick={handleViewItems}
            loading={actionStates.view === 'loading'}
            done={actionStates.view === 'done'}
          />
          <InsightActionButton
            label="Create Action Plan"
            icon={"\u{1F4CB}"}
            onClick={handleCreateActionPlan}
            loading={actionStates.plan === 'loading'}
            done={actionStates.plan === 'done'}
          />
        </div>
      );
    }

    if (insight.type === 'insight') {
      return (
        <div className="swiftly-action-buttons" style={{ marginTop: 10, paddingTop: 10 }}>
          <InsightActionButton
            label="Send Reminder"
            icon={"\u{1F514}"}
            onClick={handleSendReminder}
            loading={actionStates.reminder === 'loading'}
            done={actionStates.reminder === 'done'}
          />
          <InsightActionButton
            label="Update Priorities"
            icon={"\u{1F4CA}"}
            onClick={handleUpdatePriorities}
            loading={actionStates.priorities === 'loading'}
            done={actionStates.priorities === 'done'}
          />
        </div>
      );
    }

    if (insight.type === 'recommendation') {
      return (
        <div className="swiftly-action-buttons" style={{ marginTop: 10, paddingTop: 10 }}>
          <InsightActionButton
            label="View Items"
            icon={"\u{1F50D}"}
            onClick={handleViewItems}
            loading={actionStates.view === 'loading'}
            done={actionStates.view === 'done'}
          />
          <InsightActionButton
            label="Send Reminder"
            icon={"\u{1F514}"}
            onClick={handleSendReminder}
            loading={actionStates.reminder === 'loading'}
            done={actionStates.reminder === 'done'}
          />
        </div>
      );
    }

    return null;
  })();

  return (
    <>
      {actionsContent}
      {viewItems && (
        <ItemsModal
          items={viewItems}
          boardName={insight.board || 'Board'}
          onClose={() => setViewItems(null)}
        />
      )}
    </>
  );
}

/**
 * Empty state placeholder for charts when data is missing.
 */
function ChartEmptyState({ message }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: 280,
      color: 'var(--swiftly-text-secondary)',
      fontSize: 14,
      textAlign: 'center',
      padding: 20,
    }}>
      <div>
        <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.4 }}>{"\u{1F4CA}"}</div>
        <p>{message}</p>
      </div>
    </div>
  );
}

function ReportingView({ mode = 'dashboard' }) {
  const {
    token,
    boards,
    selectedBoardIds,
    toggleBoard: ctxToggleBoard,
    invalidateCache,
  } = useSwiftly();

  const [reportData, setReportData] = useState(null);
  const [aiReport, setAiReport] = useState(null);
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
  }, []);

  // Export handlers
  const handleExportPdf = useCallback(async () => {
    setExporting(true);
    try {
      const html = await api.exportHtml(token, selectedBoardIds, {
        title: 'Project Status Report',
        includeAi: true,
      });
      // Open in a new tab instantly, user can then print to PDF
      const blob = new Blob([html], { type: 'text/html; charset=utf-8' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      // Clean up after a delay to allow the tab to load
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (err) {
      setError('Export failed: ' + err.message);
    } finally {
      setExporting(false);
    }
  }, [token, selectedBoardIds]);

  const handleExportText = useCallback(async () => {
    setExporting(true);
    try {
      const text = await api.exportText(token, selectedBoardIds);
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `swiftly-report-${new Date().toISOString().slice(0, 10)}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Export failed: ' + err.message);
    } finally {
      setExporting(false);
    }
  }, [token, selectedBoardIds]);

  const handleExportJson = useCallback(async () => {
    setExporting(true);
    try {
      const data = await api.exportJson(token, selectedBoardIds);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `swiftly-report-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Export failed: ' + err.message);
    } finally {
      setExporting(false);
    }
  }, [token, selectedBoardIds]);

  const toggleBoard = ctxToggleBoard;

  // Generate report
  const generateReport = useCallback(async () => {
    if (selectedBoardIds.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const result = await api.generateReport(token, selectedBoardIds, {
        tone: 'professional',
        audience: 'manager',
        includeRecommendations: true,
      });

      setReportData(result.data);
      setAiReport(result.report);
      setInsights(result.insights || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, selectedBoardIds]);

  // Prepare chart data safely
  const barChartData = reportData?.boards?.map((b) => {
    const boardName = b.name || b.boardName || `Board ${b.id}`;
    return {
      name: boardName.length > 20 ? boardName.slice(0, 20) + '...' : boardName,
      progress: b.progress,
      items: b.totalItems,
    };
  }) || [];

  const statusEntries = reportData ? Object.entries(reportData.statusBreakdown) : [];
  const pieChartData = statusEntries.map(([name, value]) => ({ name, value }));

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
      {/* Toast notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Board Selector */}
      <div className="swiftly-card">
        <div className="swiftly-card-header">
          <span className="swiftly-card-title">
            {mode === 'reports' ? 'Select Boards for Report' : 'Select Boards for Dashboard'}
          </span>
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
        <div style={{ marginTop: 16 }}>
          <button
            onClick={generateReport}
            disabled={selectedBoardIds.length === 0 || loading}
            className="swiftly-btn-primary"
          >
            {loading ? 'Generating Report...' : 'Generate Report'}
          </button>
        </div>
      </div>

      {error && (
        <div className="swiftly-card" style={{ borderLeft: '4px solid var(--swiftly-danger)' }}>
          <p style={{ color: 'var(--swiftly-danger)' }}>{error}</p>
        </div>
      )}

      {/* Report Results */}
      {reportData && (
        <>
          {/* Export Bar */}
          <div className="swiftly-card swiftly-export-bar">
            <span style={{ fontSize: 14, fontWeight: 600 }}>
              Report generated at {new Date().toLocaleTimeString()}
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleExportPdf} disabled={exporting} className="swiftly-export-btn">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M14 3v4a1 1 0 001 1h4"/><path d="M17 21H7a2 2 0 01-2-2V5a2 2 0 012-2h7l5 5v11a2 2 0 01-2 2z"/>
                  <path d="M12 11v6"/><path d="M9 14l3 3 3-3"/>
                </svg>
                PDF
              </button>
              <button onClick={handleExportText} disabled={exporting} className="swiftly-export-btn">
                TXT
              </button>
              <button onClick={handleExportJson} disabled={exporting} className="swiftly-export-btn">
                JSON
              </button>
            </div>
          </div>

          {/* KPI Cards -- shown in dashboard mode or always */}
          {(mode === 'dashboard' || !mode) && (
            <div className="swiftly-grid swiftly-grid-4">
              <div className="swiftly-card swiftly-stat">
                <div className="swiftly-stat-value">{reportData.totalBoards}</div>
                <div className="swiftly-stat-label">Boards</div>
              </div>
              <div className="swiftly-card swiftly-stat">
                <div className="swiftly-stat-value">{reportData.totalItems}</div>
                <div className="swiftly-stat-label">Total Items</div>
              </div>
              <div className="swiftly-card swiftly-stat">
                <div className="swiftly-stat-value">{reportData.totalSubitems}</div>
                <div className="swiftly-stat-label">Subitems</div>
              </div>
              <div className="swiftly-card swiftly-stat">
                <div className="swiftly-stat-value" style={{
                  color: reportData.overallProgress >= 75 ? 'var(--swiftly-success)'
                    : reportData.overallProgress >= 40 ? 'var(--swiftly-warning)'
                    : 'var(--swiftly-danger)'
                }}>
                  {reportData.overallProgress}%
                </div>
                <div className="swiftly-stat-label">Overall Progress</div>
              </div>
            </div>
          )}

          {/* Charts Row -- shown in dashboard mode */}
          {(mode === 'dashboard' || !mode) && (
            <div className="swiftly-grid swiftly-grid-2">
              {/* Board Progress Bar Chart */}
              <div className="swiftly-card">
                <div className="swiftly-card-header">
                  <span className="swiftly-card-title">Board Progress</span>
                </div>
                {barChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={barChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--swiftly-border)" />
                      <XAxis dataKey="name" fontSize={12} tick={{ fill: '#676879' }} />
                      <YAxis domain={[0, 100]} fontSize={12} tick={{ fill: '#676879' }} tickFormatter={(v) => `${v}%`} />
                      <Tooltip
                        formatter={(value, name) => name === 'progress' ? [`${value}%`, 'Progress'] : [value, name]}
                        contentStyle={{ borderRadius: 8, border: '1px solid #e6e9ef', fontSize: 13 }}
                      />
                      <Bar dataKey="progress" fill="#0073ea" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <ChartEmptyState message="No board data available. Select boards and generate a report to see progress." />
                )}
              </div>

              {/* Status Pie Chart */}
              <div className="swiftly-card">
                <div className="swiftly-card-header">
                  <span className="swiftly-card-title">Status Distribution</span>
                </div>
                {pieChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={90}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={true}
                      >
                        {pieChartData.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e6e9ef', fontSize: 13 }} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <ChartEmptyState message="No status columns found on the selected boards. Add status columns to your boards to see distribution." />
                )}
              </div>
            </div>
          )}

          {/* Per-Board Breakdown */}
          <div className="swiftly-card">
            <div className="swiftly-card-header">
              <span className="swiftly-card-title">Board Breakdown</span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--swiftly-border)' }}>
                  <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--swiftly-text-secondary)', fontWeight: 500 }}>Board</th>
                  <th style={{ textAlign: 'center', padding: '8px 12px', color: 'var(--swiftly-text-secondary)', fontWeight: 500 }}>Items</th>
                  <th style={{ textAlign: 'center', padding: '8px 12px', color: 'var(--swiftly-text-secondary)', fontWeight: 500 }}>Subitems</th>
                  <th style={{ textAlign: 'center', padding: '8px 12px', color: 'var(--swiftly-text-secondary)', fontWeight: 500 }}>Done</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--swiftly-text-secondary)', fontWeight: 500, width: '30%' }}>Progress</th>
                </tr>
              </thead>
              <tbody>
                {reportData.boards.map((board) => (
                  <tr key={board.id} style={{ borderBottom: '1px solid var(--swiftly-border)' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 500 }}>{board.name || board.boardName || `Board ${board.id}`}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>{board.totalItems}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>{board.subitems}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>{board.completedItems}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="swiftly-progress" style={{ flex: 1 }}>
                          <div
                            className={`swiftly-progress-fill ${
                              board.progress >= 75 ? 'swiftly-progress-fill--success'
                                : board.progress >= 40 ? 'swiftly-progress-fill--warning'
                                : 'swiftly-progress-fill--danger'
                            }`}
                            style={{ width: `${board.progress}%` }}
                          />
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 600, minWidth: 36 }}>{board.progress}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* AI Insights with Action Buttons */}
          {insights.length > 0 && (
            <div className="swiftly-card">
              <div className="swiftly-card-header">
                <span className="swiftly-card-title">AI Insights</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {insights.map((insight, i) => (
                  <div key={i} className={`swiftly-insight swiftly-insight--${insight.type}`}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{insight.title}</div>
                      <div style={{ fontSize: 13, color: 'var(--swiftly-text-secondary)' }}>{insight.description}</div>
                      {insight.board && (
                        <div style={{ fontSize: 12, color: 'var(--swiftly-text-secondary)', marginTop: 4 }}>
                          Board: {insight.board}
                        </div>
                      )}
                      <InsightActions
                        insight={insight}
                        token={token}
                        onToast={showToast}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Report -- shown in reports mode or always */}
          {aiReport && (
            <div className="swiftly-card">
              <div className="swiftly-card-header">
                <span className="swiftly-card-title">AI-Generated Report</span>
                <span style={{ fontSize: 12, color: 'var(--swiftly-text-secondary)' }}>
                  {aiReport.model !== 'fallback' ? `Powered by ${aiReport.model}` : 'Basic Report'}
                </span>
              </div>
              <div
                className="swiftly-ai-report-content"
                dangerouslySetInnerHTML={{
                  __html: aiReport.report
                    .replace(/^### (.*$)/gm, '<h4 style="margin-top:16px;margin-bottom:8px">$1</h4>')
                    .replace(/^## (.*$)/gm, '<h3 style="margin-top:20px;margin-bottom:10px">$1</h3>')
                    .replace(/^# (.*$)/gm, '<h2 style="margin-top:24px;margin-bottom:12px">$1</h2>')
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/^- (.*$)/gm, '<div style="padding-left:16px;margin:2px 0">&#8226; $1</div>')
                }}
              />
            </div>
          )}
        </>
      )}

      {/* Empty State */}
      {!reportData && !loading && (
        <div className="swiftly-empty">
          <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }}>
            <svg width="48" height="48" viewBox="0 0 28 28" fill="none">
              <rect width="28" height="28" rx="6" fill="#0073ea" />
              <path d="M8 18L13 8L18 14L22 10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="22" cy="10" r="2" fill="white" />
            </svg>
          </div>
          <h3>{mode === 'reports' ? 'Generate a detailed report' : 'Select boards and generate a report'}</h3>
          <p>Choose one or more boards above, then click "Generate Report" to see cross-board analytics with AI insights.</p>
        </div>
      )}
    </div>
  );
}

export default ReportingView;
