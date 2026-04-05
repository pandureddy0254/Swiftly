import React, { useState } from 'react';
import { useMonday } from '@core/hooks/useMonday';
import { SwiftlyProvider } from '@core/state/SwiftlyContext';
import DashboardView from '@features/dashboard/DashboardView';
import ReportingView from '@features/reporting/ReportingView';
import AiChatView from '@features/ai-chat/AiChatView';
import TimeTrackingView from '@features/time-tracking/TimeTrackingView';
import SprintView from '@features/sprint/SprintView';

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'ai-chat', label: 'AI Agent', icon: '🤖' },
  { id: 'sprint', label: 'Sprint', icon: '🏃' },
  { id: 'time-tracking', label: 'Time Tracking', icon: '⏱️' },
  { id: 'reports', label: 'Reports', icon: '📈' },
];

function App() {
  const { token, isReady, error, boardId, theme } = useMonday();
  const [activeTab, setActiveTab] = useState('dashboard');

  if (error && !isReady) {
    return (
      <div className="swiftly-app">
        <div className="swiftly-empty">
          <div className="swiftly-empty-illustration">⚠️</div>
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
      <div className="swiftly-header">
        <div className="swiftly-brand">
          <div className="swiftly-brand-logo">
            <svg width="20" height="20" viewBox="0 0 28 28" fill="none">
              <path d="M8 18L13 8L18 14L22 10" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="22" cy="10" r="2" fill="white" />
            </svg>
          </div>
          <span className="swiftly-brand-name">Swiftly</span>
          <span className="swiftly-brand-tagline">AI Command Center</span>
        </div>
      </div>

      <SwiftlyProvider token={token}>
        {/* Tabs */}
        <div className="swiftly-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`swiftly-tab ${activeTab === tab.id ? 'swiftly-tab--active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="swiftly-tab-icon">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Feature Views */}
        <div key={activeTab} className="swiftly-fade-in">
          {activeTab === 'dashboard' && <DashboardView />}
          {activeTab === 'ai-chat' && <AiChatView />}
          {activeTab === 'sprint' && <SprintView />}
          {activeTab === 'time-tracking' && <TimeTrackingView />}
          {activeTab === 'reports' && <ReportingView mode="reports" />}
        </div>
      </SwiftlyProvider>
    </div>
  );
}

export default App;
