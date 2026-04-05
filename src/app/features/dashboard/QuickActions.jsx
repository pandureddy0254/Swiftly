import React from 'react';

function QuickActions({ token, selectedBoardIds, onAction, showToast }) {
  const actions = [
    { label: 'Generate Report', icon: '\uD83D\uDCCA', tab: 'reports' },
    { label: 'Ask AI', icon: '\uD83E\uDD16', tab: 'ai-agent' },
    { label: 'Start Timer', icon: '\u23F1\uFE0F', tab: 'time-tracking' },
    { label: 'View Sprint', icon: '\uD83C\uDFC3', tab: 'sprint' },
  ];

  const handleClick = (tab) => {
    try {
      localStorage.setItem('swiftly-desired-tab', tab);
      window.parent.postMessage({ type: 'swiftly-switch-tab', tab }, '*');
    } catch { /* noop */ }
  };

  return (
    <div className="swiftly-card">
      <div className="swiftly-card-header">
        <span className="swiftly-card-title">Quick Actions</span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {actions.map((a) => (
          <button
            key={a.tab}
            className="swiftly-action-btn"
            style={{ fontSize: 12, padding: '8px 16px' }}
            onClick={() => handleClick(a.tab)}
          >
            <span>{a.icon}</span> {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default QuickActions;
