import React from 'react';

const SUGGESTED_QUESTIONS = [
  'What is the overall progress across all boards?',
  'Which items are overdue or stuck?',
  'Who has the most tasks assigned?',
  'Summarize blockers and risks',
  'What was completed this week?',
  'Create subitems for the highest priority task',
];

function WelcomeScreen({ onSuggestionClick, selectedBoardIds }) {
  return (
    <div style={{ padding: '40px 20px', textAlign: 'center' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>
        <svg width="48" height="48" viewBox="0 0 28 28" fill="none">
          <rect width="28" height="28" rx="6" fill="#0073ea" />
          <path d="M8 18L13 8L18 14L22 10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="22" cy="10" r="2" fill="white" />
        </svg>
      </div>
      <h3 style={{ fontSize: 18, marginBottom: 8 }}>Swiftly AI Agent</h3>
      <p style={{ color: 'var(--swiftly-text-secondary)', fontSize: 14, marginBottom: 8 }}>
        Ask me anything about your monday.com boards. I can analyze progress, find blockers, summarize status, and take actions on your behalf.
      </p>
      <p style={{ color: 'var(--swiftly-text-secondary)', fontSize: 13, marginBottom: 24 }}>
        I can create items, update statuses, add subitems, and more -- just ask.
      </p>

      {/* Suggested questions */}
      {selectedBoardIds.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
          {SUGGESTED_QUESTIONS.map((q, i) => (
            <button
              key={i}
              onClick={() => onSuggestionClick(q)}
              style={{
                padding: '8px 16px',
                borderRadius: 20,
                border: '1px solid var(--swiftly-border)',
                background: 'white',
                color: 'var(--swiftly-text)',
                fontSize: 13,
                cursor: 'pointer',
                transition: 'border-color 0.2s',
              }}
              onMouseOver={(e) => e.target.style.borderColor = 'var(--swiftly-primary)'}
              onMouseOut={(e) => e.target.style.borderColor = 'var(--swiftly-border)'}
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {selectedBoardIds.length === 0 && (
        <p style={{ color: 'var(--swiftly-warning)', fontSize: 13 }}>
          Please select at least one board above to start chatting.
        </p>
      )}
    </div>
  );
}

export default WelcomeScreen;
