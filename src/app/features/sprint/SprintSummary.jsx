import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as api from '@core/api/swiftly-client';

/** Basic markdown to HTML. */
function formatMarkdown(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^### (.+)$/gm, '<h4>$1</h4>').replace(/^## (.+)$/gm, '<h3>$1</h3>')
    .replace(/^- (.+)$/gm, '\u2022 $1').replace(/\n/g, '<br />');
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

export default SprintSummary;
