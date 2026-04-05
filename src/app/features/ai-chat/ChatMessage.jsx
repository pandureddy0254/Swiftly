import React, { useState } from 'react';
import * as api from '@core/api/swiftly-client';

const ACTION_ICONS = {
  create_subitems: '\u{1F4E5}',
  update_status: '\u{1F504}',
  create_item: '\u2795',
  bulk_update: '\u26A1',
  assign: '\u{1F464}',
};

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

function ChatMessage({ message, onAction, showToast, token, selectedBoardIds, invalidateCache }) {
  const handleActionSuccess = (action) => {
    showToast(`${action.label} completed successfully`);
    invalidateCache();
  };

  const handleActionError = (errorMsg) => {
    showToast(`Action failed: ${errorMsg}`, 'error');
  };

  return (
    <div className={`swiftly-chat-message ${message.role === 'user' ? 'swiftly-chat-message--user' : ''}`}>
      <div
        className={`swiftly-chat-bubble ${message.role === 'user' ? 'swiftly-chat-bubble--user' : 'swiftly-chat-bubble--ai'}`}
        style={message.isError ? { borderColor: 'var(--swiftly-danger)' } : {}}
      >
        {/* Message text */}
        <div>{formatMessageContent(message.content)}</div>

        {/* Action buttons row */}
        {message.actions && message.actions.length > 0 && (
          <div className="swiftly-action-buttons">
            {message.actions.map((action, j) => (
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
        {message.tokensUsed && (
          <div style={{ marginTop: 8, fontSize: 11, color: 'var(--swiftly-text-secondary)', textAlign: 'right' }}>
            {message.tokensUsed} tokens
          </div>
        )}
      </div>
    </div>
  );
}

export default ChatMessage;
