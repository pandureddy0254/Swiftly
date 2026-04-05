import React, { useState } from 'react';

// ---------------------------------------------------------------------------
// Action Button (reusable)
// ---------------------------------------------------------------------------
function ActionBtn({ label, icon, onClick, loading, done }) {
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

// ---------------------------------------------------------------------------
// Suggestion Card
// ---------------------------------------------------------------------------
function SuggestionCard({ suggestion, token, onToast }) {
  const [states, setStates] = useState({});
  const set = (k, v) => setStates((p) => ({ ...p, [k]: v }));

  const exec = async (key, fn) => {
    set(key, 'loading');
    try {
      await fn();
      set(key, 'done');
      onToast('Action completed successfully', 'success');
    } catch (err) {
      set(key, null);
      onToast('Action failed: ' + err.message, 'error');
    }
  };

  const severityClass = suggestion.severity === 'critical' ? 'risk'
    : suggestion.severity === 'warning' ? 'insight'
    : 'recommendation';

  return (
    <div className={`swiftly-insight swiftly-insight--${severityClass}`}>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{suggestion.title}</div>
        <div style={{ fontSize: 13, color: 'var(--swiftly-text-secondary)' }}>{suggestion.description}</div>
        {suggestion.board && suggestion.board !== 'Unknown' && (
          <div style={{ fontSize: 12, color: 'var(--swiftly-text-secondary)', marginTop: 4 }}>Board: {suggestion.board}</div>
        )}
        {suggestion.actions && suggestion.actions.length > 0 && (
          <div className="swiftly-action-buttons" style={{ marginTop: 10, paddingTop: 10 }}>
            {suggestion.actions.map((action) => (
              <ActionBtn
                key={action.key}
                label={action.label}
                icon={action.icon}
                loading={states[action.key] === 'loading'}
                done={states[action.key] === 'done'}
                onClick={() => exec(action.key, () => action.handler(token))}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SuggestionCards (container)
// ---------------------------------------------------------------------------
function SuggestionCards({ suggestions, onAction, loading }) {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="swiftly-card">
      <div className="swiftly-card-header">
        <span className="swiftly-card-title">Smart Suggestions</span>
        <span style={{ fontSize: 12, color: 'var(--swiftly-text-secondary)' }}>
          {suggestions.filter((s) => s.severity === 'critical').length} critical &middot;{' '}
          {suggestions.filter((s) => s.severity === 'warning').length} warnings
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {suggestions
          .sort((a, b) => {
            const order = { critical: 0, warning: 1, info: 2, success: 3 };
            return (order[a.severity] ?? 4) - (order[b.severity] ?? 4);
          })
          .map((suggestion) => (
            <SuggestionCard
              key={suggestion.id}
              suggestion={suggestion}
              token={onAction.token}
              onToast={onAction.showToast}
            />
          ))}
      </div>
    </div>
  );
}

export default SuggestionCards;
