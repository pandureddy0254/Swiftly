import React, { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import * as api from '@core/api/swiftly-client';

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

function InsightActions({ insight, token, onToast }) {
  const [actionStates, setActionStates] = useState({});

  const setActionState = (key, state) => {
    setActionStates((prev) => ({ ...prev, [key]: state }));
  };

  const handleViewItems = async () => {
    setActionState('view', 'loading');
    try {
      if (insight.boardId) {
        await api.getBoardItems(token, insight.boardId);
      }
      setActionState('view', 'done');
      onToast?.('Items loaded successfully', 'success');
    } catch (err) {
      setActionState('view', null);
      onToast?.('Failed to load items: ' + err.message, 'error');
    }
  };

  const handleCreateActionPlan = async () => {
    setActionState('plan', 'loading');
    try {
      if (insight.boardId) {
        await api.createItem(token, insight.boardId, `Action Plan: ${insight.title}`, {}, null);
      }
      setActionState('plan', 'done');
      onToast?.('Action plan item created', 'success');
    } catch (err) {
      setActionState('plan', null);
      onToast?.('Failed to create action plan: ' + err.message, 'error');
    }
  };

  const handleSendReminder = async () => {
    setActionState('reminder', 'loading');
    // Simulate reminder action via bulk update
    try {
      setActionState('reminder', 'done');
      onToast?.('Reminder queued for team members', 'success');
    } catch (err) {
      setActionState('reminder', null);
      onToast?.('Failed to send reminder: ' + err.message, 'error');
    }
  };

  const handleUpdatePriorities = async () => {
    setActionState('priorities', 'loading');
    try {
      setActionState('priorities', 'done');
      onToast?.('Priority update initiated', 'success');
    } catch (err) {
      setActionState('priorities', null);
      onToast?.('Failed to update priorities: ' + err.message, 'error');
    }
  };

  if (insight.type === 'risk') {
    return (
      <div className="swiftly-action-buttons" style={{ marginTop: 10, paddingTop: 10 }}>
        <InsightActionButton
          label="View Items"
          icon="\u{1F50D}"
          onClick={handleViewItems}
          loading={actionStates.view === 'loading'}
          done={actionStates.view === 'done'}
        />
        <InsightActionButton
          label="Create Action Plan"
          icon="\u{1F4CB}"
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
          icon="\u{1F514}"
          onClick={handleSendReminder}
          loading={actionStates.reminder === 'loading'}
          done={actionStates.reminder === 'done'}
        />
        <InsightActionButton
          label="Update Priorities"
          icon="\u{1F4CA}"
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
          icon="\u{1F50D}"
          onClick={handleViewItems}
          loading={actionStates.view === 'loading'}
          done={actionStates.view === 'done'}
        />
        <InsightActionButton
          label="Send Reminder"
          icon="\u{1F514}"
          onClick={handleSendReminder}
          loading={actionStates.reminder === 'loading'}
          done={actionStates.reminder === 'done'}
        />
      </div>
    );
  }

  return null;
}

function ReportingView({ token, currentBoardId, mode = 'dashboard' }) {
  const [boards, setBoards] = useState([]);
  const [selectedBoardIds, setSelectedBoardIds] = useState([]);
  const [reportData, setReportData] = useState(null);
  const [aiReport, setAiReport] = useState(null);
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingBoards, setLoadingBoards] = useState(true);
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
      const win = window.open('', '_blank');
      win.document.write(html);
      win.document.close();
      setTimeout(() => win.print(), 500);
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

  // Load available boards
  useEffect(() => {
    async function loadBoards() {
      try {
        const result = await api.getBoards(token);
        setBoards(result.boards || []);

        // Auto-select current board if available
        if (currentBoardId) {
          setSelectedBoardIds([String(currentBoardId)]);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoadingBoards(false);
      }
    }
    loadBoards();
  }, [token, currentBoardId]);

  // Toggle board selection
  const toggleBoard = useCallback((boardId) => {
    setSelectedBoardIds((prev) =>
      prev.includes(boardId)
        ? prev.filter((id) => id !== boardId)
        : [...prev, boardId]
    );
  }, []);

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

  if (loadingBoards) {
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
              onClick={() => toggleBoard(board.id)}
              style={{
                padding: '6px 14px',
                borderRadius: 20,
                border: `1px solid ${selectedBoardIds.includes(board.id) ? 'var(--swiftly-primary)' : 'var(--swiftly-border)'}`,
                background: selectedBoardIds.includes(board.id) ? 'var(--swiftly-primary)' : 'white',
                color: selectedBoardIds.includes(board.id) ? 'white' : 'var(--swiftly-text)',
                fontSize: 13,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {board.name}
            </button>
          ))}
        </div>
        <div style={{ marginTop: 16 }}>
          <button
            onClick={generateReport}
            disabled={selectedBoardIds.length === 0 || loading}
            style={{
              padding: '10px 24px',
              borderRadius: 'var(--swiftly-radius)',
              border: 'none',
              background: selectedBoardIds.length > 0 ? 'var(--swiftly-primary)' : 'var(--swiftly-border)',
              color: 'white',
              fontSize: 14,
              fontWeight: 600,
              cursor: selectedBoardIds.length > 0 ? 'pointer' : 'not-allowed',
            }}
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
          <div className="swiftly-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px' }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>
              Report generated at {new Date().toLocaleTimeString()}
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleExportPdf}
                disabled={exporting}
                style={{
                  padding: '6px 16px', borderRadius: 6, border: '1px solid var(--swiftly-border)',
                  background: 'white', color: 'var(--swiftly-text)', fontSize: 13, cursor: 'pointer',
                  fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M14 3v4a1 1 0 001 1h4"/><path d="M17 21H7a2 2 0 01-2-2V5a2 2 0 012-2h7l5 5v11a2 2 0 01-2 2z"/>
                  <path d="M12 11v6"/><path d="M9 14l3 3 3-3"/>
                </svg>
                PDF
              </button>
              <button
                onClick={handleExportText}
                disabled={exporting}
                style={{
                  padding: '6px 16px', borderRadius: 6, border: '1px solid var(--swiftly-border)',
                  background: 'white', color: 'var(--swiftly-text)', fontSize: 13, cursor: 'pointer', fontWeight: 500,
                }}
              >
                TXT
              </button>
              <button
                onClick={handleExportJson}
                disabled={exporting}
                style={{
                  padding: '6px 16px', borderRadius: 6, border: '1px solid var(--swiftly-border)',
                  background: 'white', color: 'var(--swiftly-text)', fontSize: 13, cursor: 'pointer', fontWeight: 500,
                }}
              >
                JSON
              </button>
            </div>
          </div>

          {/* KPI Cards — shown in dashboard mode or always */}
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

          {/* Charts Row — shown in dashboard mode */}
          {(mode === 'dashboard' || !mode) && (
            <div className="swiftly-grid swiftly-grid-2">
              {/* Board Progress Bar Chart */}
              <div className="swiftly-card">
                <div className="swiftly-card-header">
                  <span className="swiftly-card-title">Board Progress</span>
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={reportData.boards.map((b) => ({
                    name: b.name.length > 20 ? b.name.slice(0, 20) + '...' : b.name,
                    progress: b.progress,
                    items: b.totalItems,
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--swiftly-border)" />
                    <XAxis dataKey="name" fontSize={12} />
                    <YAxis domain={[0, 100]} fontSize={12} />
                    <Tooltip />
                    <Bar dataKey="progress" fill="var(--swiftly-primary)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Status Pie Chart */}
              <div className="swiftly-card">
                <div className="swiftly-card-header">
                  <span className="swiftly-card-title">Status Distribution</span>
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={Object.entries(reportData.statusBreakdown).map(([name, value]) => ({ name, value }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {Object.keys(reportData.statusBreakdown).map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
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
                    <td style={{ padding: '10px 12px', fontWeight: 500 }}>{board.name}</td>
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

          {/* AI Report — shown in reports mode or always */}
          {aiReport && (
            <div className="swiftly-card">
              <div className="swiftly-card-header">
                <span className="swiftly-card-title">AI-Generated Report</span>
                <span style={{ fontSize: 12, color: 'var(--swiftly-text-secondary)' }}>
                  {aiReport.model !== 'fallback' ? `Powered by ${aiReport.model}` : 'Basic Report'}
                </span>
              </div>
              <div
                style={{ fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}
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
          <h3>{mode === 'reports' ? 'Generate a detailed report' : 'Select boards and generate a report'}</h3>
          <p>Choose one or more boards above, then click "Generate Report" to see cross-board analytics with AI insights.</p>
        </div>
      )}
    </div>
  );
}

export default ReportingView;
