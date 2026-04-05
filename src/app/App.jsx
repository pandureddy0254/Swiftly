import React, { useState } from 'react';
import { useMonday } from '@core/hooks/useMonday';
import ReportingView from '@features/reporting/ReportingView';
import AiChatView from '@features/ai-chat/AiChatView';

function App() {
  const { token, isReady, error, boardId, theme } = useMonday();
  const [activeTab, setActiveTab] = useState('reporting');

  if (error && !isReady) {
    return (
      <div className="swiftly-app">
        <div className="swiftly-empty">
          <h3>Connection Error</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className="swiftly-app">
        <div className="swiftly-loading">
          <div className="swiftly-spinner" />
          Loading Swiftly...
        </div>
      </div>
    );
  }

  return (
    <div className={`swiftly-app ${theme === 'dark' ? 'swiftly-dark' : ''}`}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <rect width="28" height="28" rx="6" fill="#0073ea" />
            <path d="M8 18L13 8L18 14L22 10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="22" cy="10" r="2" fill="white" />
          </svg>
          <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--swiftly-text)' }}>
            Swiftly
          </span>
          <span style={{ fontSize: 12, color: 'var(--swiftly-text-secondary)', marginLeft: 4 }}>
            AI Command Center
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="swiftly-tabs">
        <button
          className={`swiftly-tab ${activeTab === 'reporting' ? 'swiftly-tab--active' : ''}`}
          onClick={() => setActiveTab('reporting')}
        >
          Dashboard
        </button>
        <button
          className={`swiftly-tab ${activeTab === 'ai-chat' ? 'swiftly-tab--active' : ''}`}
          onClick={() => setActiveTab('ai-chat')}
        >
          AI Agent
        </button>
        <button
          className={`swiftly-tab ${activeTab === 'reports' ? 'swiftly-tab--active' : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          Reports
        </button>
      </div>

      {/* Feature Views — each wrapped for smooth transition */}
      <div key={activeTab} style={{ animation: 'fadeIn 0.25s ease' }}>
        {activeTab === 'reporting' && (
          <ReportingView token={token} currentBoardId={boardId} mode="dashboard" />
        )}
        {activeTab === 'ai-chat' && (
          <AiChatView token={token} currentBoardId={boardId} />
        )}
        {activeTab === 'reports' && (
          <ReportingView token={token} currentBoardId={boardId} mode="reports" />
        )}
      </div>
    </div>
  );
}

export default App;
