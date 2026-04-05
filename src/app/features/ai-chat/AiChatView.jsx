import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as api from '@core/api/swiftly-client';
import { useSwiftly } from '@core/state/useSwiftly';
import BoardSelector from '@core/components/BoardSelector';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import WelcomeScreen from './WelcomeScreen';

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

function AiChatView() {
  const {
    token,
    selectedBoardIds,
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
        <BoardSelector
          label="Context boards:"
          subtitle="(AI Agent will analyze and take actions on these boards)"
        />
      </div>

      {/* Chat container */}
      <div className="swiftly-chat" style={{ height: 'calc(100vh - 260px)', background: 'var(--swiftly-bg)', borderRadius: 'var(--swiftly-radius)', marginTop: 1 }}>
        <div className="swiftly-chat-messages">
          {/* Welcome message */}
          {messages.length === 0 && (
            <WelcomeScreen
              onSuggestionClick={sendMessage}
              selectedBoardIds={selectedBoardIds}
            />
          )}

          {/* Messages */}
          {messages.map((msg, i) => (
            <ChatMessage
              key={i}
              message={msg}
              showToast={showToast}
              token={token}
              selectedBoardIds={selectedBoardIds}
              invalidateCache={invalidateCache}
            />
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
        <ChatInput
          input={input}
          setInput={setInput}
          onSend={sendMessage}
          disabled={selectedBoardIds.length === 0 || loading}
          loading={loading}
          selectedBoardIds={selectedBoardIds}
        />
      </div>
    </div>
  );
}

export default AiChatView;
