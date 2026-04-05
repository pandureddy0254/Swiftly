import React, { useState, useEffect, useCallback } from 'react';
import * as api from '@core/api/swiftly-client';
import { useSwiftly } from '@core/state/useSwiftly';
import BoardSelector from '@core/components/BoardSelector';
import ReportCharts from './ReportCharts';
import ReportSummary from './ReportSummary';
import InsightCards from './InsightCards';
import ExportButtons from './ExportButtons';

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
        <BoardSelector
          label={mode === 'reports' ? 'Select Boards for Report' : 'Select Boards for Dashboard'}
          showCount={true}
        />
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
          <ExportButtons
            onExportHtml={handleExportPdf}
            onExportText={handleExportText}
            onExportJson={handleExportJson}
            loading={exporting}
          />

          {/* KPI Cards -- shown in dashboard mode or always */}
          {(mode === 'dashboard' || !mode) && (
            <ReportSummary reportData={reportData} />
          )}

          {/* Charts Row -- shown in dashboard mode */}
          {(mode === 'dashboard' || !mode) && (
            <ReportCharts reportData={reportData} />
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
          <InsightCards
            insights={insights}
            onToast={showToast}
            token={token}
          />

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
