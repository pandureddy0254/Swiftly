import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as api from '@core/api/swiftly-client';
import { useSwiftly } from '@core/state/useSwiftly';

const SUGGESTED_QUESTIONS = [
  'What is the overall progress across all boards?',
  'Which items are overdue or stuck?',
  'Who has the most tasks assigned?',
  'Summarize blockers and risks',
  'What was completed this week?',
  'Create subitems for the highest priority task',
];

const ACTION_ICONS = {
  create_subitems: '\u{1F4E5}',
  update_status: '\u{1F504}',
  create_item: '\u2795',
  bulk_update: '\u26A1',
  assign: '\u{1F464}',
};

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

function ActionButton({ action, token, onSuccess, onError }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      if (action.type === 'create_subitems') {
        if (!action.data.parentItemId) {
          throw new Error('No parent item identified. Please mention the specific task name in your question.');
        }
        await api.createSubitems(token, action.data.parentItemId, action.data.subitems);
      } else if (action.type === 'update_status') {
        await api.updateItem(
          token,
          action.data.boardId,
          action.data.itemId,
          action.data.columnValues || { status: { label: action.data.status } }
        );
      } else if (action.type === 'create_item') {
        await api.createItem(
          token,
          action.data.boardId,
          action.data.itemName,
          action.data.columnValues,
          action.data.groupId
        );
      } else if (action.type === 'bulk_update') {
        await api.bulkUpdate(
          token,
          action.data.boardId,
          action.data.itemIds,
          action.data.columnValues
        );
      } else if (action.type === 'assign') {
        await api.updateItem(
          token,
          action.data.boardId,
          action.data.itemId,
          action.data.columnValues
        );
      }
      setDone(true);
      onSuccess?.(action);
    } catch (err) {
      onError?.(err.message);
    } finally {
      setLoading(false);
    }
  };

  const icon = done ? '\u2705' : loading ? '\u23F3' : (ACTION_ICONS[action.type] || '\u25B6\uFE0F');

  return (
    <button
      className={`swiftly-action-btn ${done ? 'swiftly-action-btn--done' : ''}`}
      onClick={handleClick}
      disabled={loading || done}
    >
      <span>{icon}</span> {action.label}
    </button>
  );
}

function formatMessageContent(content) {
  if (!content) return null;
  // Simple markdown-like rendering
  return content.split('\n').map((line, j, arr) => {
    // Bold
    let formatted = line;
    const parts = [];
    const regex = /\*\*(.*?)\*\*/g;
    let lastIndex = 0;
    let match;
    while ((match = regex.exec(formatted)) !== null) {
      if (match.index > lastIndex) {
        parts.push(formatted.slice(lastIndex, match.index));
      }
      parts.push(<strong key={match.index}>{match[1]}</strong>);
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < formatted.length) {
      parts.push(formatted.slice(lastIndex));
    }
    const display = parts.length > 0 ? parts : formatted;

    return (
      <React.Fragment key={j}>
        {display}
        {j < arr.length - 1 && <br />}
      </React.Fragment>
    );
  });
}

function AiChatView() {
  const {
    token,
    boards,
    selectedBoardIds,
    toggleBoard: ctxToggleBoard,
    invalidateCache,
  } = useSwiftly();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [toast, setToast] = useState(null);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const toggleBoard = ctxToggleBoard;

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
  }, []);

  const sendMessage = useCallback(async (text = null) => {
    const question = text || input.trim();
    if (!question || selectedBoardIds.length === 0) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: question }]);
    setLoading(true);

    try {
      const result = await api.aiChat(token, question, selectedBoardIds, sessionId);
      setSessionId(result.sessionId);
      const answerText = result.answer || result.response || result.message || 'No response received. Please try again.';
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: answerText,
          actions: result.actions || [],
          tokensUsed: result.tokensUsed,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Sorry, I encountered an error: ${err.message}`,
          isError: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, token, selectedBoardIds, sessionId]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  const handleActionSuccess = useCallback((action) => {
    showToast(`${action.label} completed successfully`);
    invalidateCache();
  }, [showToast, invalidateCache]);

  const handleActionError = useCallback((errorMsg) => {
    showToast(`Action failed: ${errorMsg}`, 'error');
  }, [showToast]);

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

      {/* Board selector */}
      <div className="swiftly-card" style={{ marginBottom: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Context boards:</span>
          <span style={{ fontSize: 12, color: 'var(--swiftly-text-secondary)' }}>
            (AI Agent will analyze and take actions on these boards)
          </span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {boards.map((board) => (
            <button
              key={board.id}
              onClick={() => toggleBoard(String(board.id))}
              style={{
                padding: '4px 12px',
                borderRadius: 16,
                border: `1px solid ${selectedBoardIds.includes(String(board.id)) ? 'var(--swiftly-primary)' : 'var(--swiftly-border)'}`,
                background: selectedBoardIds.includes(String(board.id)) ? 'var(--swiftly-primary)' : 'white',
                color: selectedBoardIds.includes(String(board.id)) ? 'white' : 'var(--swiftly-text)',
                fontSize: 12,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {board.name}
            </button>
          ))}
        </div>
      </div>

      {/* Chat container */}
      <div className="swiftly-chat" style={{ height: 'calc(100vh - 260px)', background: 'var(--swiftly-bg)', borderRadius: 'var(--swiftly-radius)', marginTop: 1 }}>
        <div className="swiftly-chat-messages">
          {/* Welcome message */}
          {messages.length === 0 && (
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
                      onClick={() => sendMessage(q)}
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
          )}

          {/* Messages */}
          {messages.map((msg, i) => (
            <div key={i} className={`swiftly-chat-message ${msg.role === 'user' ? 'swiftly-chat-message--user' : ''}`}>
              <div
                className={`swiftly-chat-bubble ${msg.role === 'user' ? 'swiftly-chat-bubble--user' : 'swiftly-chat-bubble--ai'}`}
                style={msg.isError ? { borderColor: 'var(--swiftly-danger)' } : {}}
              >
                {/* Message text */}
                <div>{formatMessageContent(msg.content)}</div>

                {/* Action buttons row */}
                {msg.actions && msg.actions.length > 0 && (
                  <div className="swiftly-action-buttons">
                    {msg.actions.map((action, j) => (
                      <ActionButton
                        key={j}
                        action={action}
                        token={token}
                        onSuccess={handleActionSuccess}
                        onError={handleActionError}
                      />
                    ))}
                  </div>
                )}

                {/* Token usage indicator */}
                {msg.tokensUsed && (
                  <div style={{ marginTop: 8, fontSize: 11, color: 'var(--swiftly-text-secondary)', textAlign: 'right' }}>
                    {msg.tokensUsed} tokens
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {loading && (
            <div className="swiftly-chat-message">
              <div className="swiftly-chat-bubble swiftly-chat-bubble--ai">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div className="swiftly-spinner" style={{ width: 16, height: 16, borderWidth: 2, marginRight: 0 }} />
                  <span style={{ color: 'var(--swiftly-text-secondary)', fontSize: 13 }}>Analyzing your boards...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="swiftly-chat-input">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={selectedBoardIds.length > 0
              ? 'Ask a question or request an action...'
              : 'Select boards first...'
            }
            disabled={selectedBoardIds.length === 0 || loading}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || selectedBoardIds.length === 0 || loading}
            style={{
              padding: '10px 20px',
              borderRadius: 'var(--swiftly-radius)',
              border: 'none',
              background: input.trim() && selectedBoardIds.length > 0 ? 'var(--swiftly-primary)' : 'var(--swiftly-border)',
              color: 'white',
              fontWeight: 600,
              cursor: input.trim() && selectedBoardIds.length > 0 ? 'pointer' : 'not-allowed',
              fontSize: 14,
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

export default AiChatView;
