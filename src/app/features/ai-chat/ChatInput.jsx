import React, { useCallback } from 'react';

function ChatInput({ input, setInput, onSend, disabled, loading, selectedBoardIds }) {
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  }, [onSend]);

  return (
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
        onClick={() => onSend()}
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
  );
}

export default ChatInput;
