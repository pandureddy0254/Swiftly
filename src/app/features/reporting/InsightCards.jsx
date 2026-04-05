import React, { useState, useEffect } from 'react';
import * as api from '@core/api/swiftly-client';

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

function InsightActionButton({ label, icon, onClick, loading, done }) {
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

/**
 * Modal to display items from a board inline.
 */
function ItemsModal({ items, boardName, onClose }) {
  return (
    <div className="swiftly-modal-overlay" onClick={onClose}>
      <div className="swiftly-modal" onClick={(e) => e.stopPropagation()}>
        <div className="swiftly-modal-header">
          <span className="swiftly-card-title">Items: {boardName}</span>
          <button onClick={onClose} className="swiftly-modal-close">&times;</button>
        </div>
        <div className="swiftly-modal-body">
          {items.length === 0 ? (
            <p style={{ color: 'var(--swiftly-text-secondary)', textAlign: 'center', padding: 20 }}>No items found.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--swiftly-border)' }}>
                  <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--swiftly-text-secondary)', fontWeight: 500 }}>Item</th>
                  <th style={{ textAlign: 'center', padding: '8px 12px', color: 'var(--swiftly-text-secondary)', fontWeight: 500 }}>Status</th>
                  <th style={{ textAlign: 'center', padding: '8px 12px', color: 'var(--swiftly-text-secondary)', fontWeight: 500 }}>Group</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const statusCol = item.column_values?.find((c) => c.type === 'status');
                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--swiftly-border)' }}>
                      <td style={{ padding: '8px 12px', fontWeight: 500 }}>{item.name}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>{statusCol?.text || '-'}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>{item.group?.title || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function InsightActions({ insight, token, onToast }) {
  const [actionStates, setActionStates] = useState({});
  const [viewItems, setViewItems] = useState(null);

  const setActionState = (key, state) => {
    setActionStates((prev) => ({ ...prev, [key]: state }));
  };

  const handleViewItems = async () => {
    setActionState('view', 'loading');
    try {
      if (insight.boardId) {
        const result = await api.getBoardItems(token, insight.boardId);
        setViewItems(result.items || []);
        setActionState('view', 'done');
        onToast?.(`Loaded ${(result.items || []).length} items from board`, 'success');
      } else {
        onToast?.('This insight is not linked to a specific board. Try generating a new report to link insights to boards.', 'error');
        setActionState('view', null);
      }
    } catch (err) {
      setActionState('view', null);
      onToast?.('Failed to load items: ' + err.message, 'error');
    }
  };

  const handleCreateActionPlan = async () => {
    setActionState('plan', 'loading');
    try {
      if (!insight.boardId) {
        onToast?.('Cannot create action plan: this insight is not linked to a specific board. The AI generated this as a general observation.', 'error');
        setActionState('plan', null);
        return;
      }
      const itemName = `[Action Plan] ${insight.title}`;
      const result = await api.createItem(token, insight.boardId, itemName, {}, null);
      setActionState('plan', 'done');
      onToast?.(`Action plan item created on board (ID: ${result.id})`, 'success');
    } catch (err) {
      setActionState('plan', null);
      onToast?.('Failed to create action plan: ' + err.message, 'error');
    }
  };

  const handleSendReminder = async () => {
    setActionState('reminder', 'loading');
    try {
      if (!insight.boardId) {
        onToast?.('Cannot send reminder: this insight is not linked to a specific board. Reminders require a board context to notify the right people.', 'error');
        setActionState('reminder', null);
        return;
      }
      // Create a notification item on the board as a reminder
      const itemName = `[Reminder] ${insight.title} - Action needed`;
      const result = await api.createItem(token, insight.boardId, itemName, {}, null);
      setActionState('reminder', 'done');
      onToast?.(`Reminder item created on board (ID: ${result.id}). Board subscribers will be notified.`, 'success');
    } catch (err) {
      setActionState('reminder', null);
      onToast?.('Failed to send reminder: ' + err.message, 'error');
    }
  };

  const handleUpdatePriorities = async () => {
    setActionState('priorities', 'loading');
    try {
      if (!insight.boardId) {
        onToast?.('Cannot update priorities: this insight is not linked to a specific board. Generate a new report to get board-specific recommendations.', 'error');
        setActionState('priorities', null);
        return;
      }
      // Create a priority review task on the board
      const itemName = `[Priority Review] ${insight.title}`;
      const result = await api.createItem(token, insight.boardId, itemName, {}, null);
      setActionState('priorities', 'done');
      onToast?.(`Priority review item created on board (ID: ${result.id}). Review and reassign priorities as needed.`, 'success');
    } catch (err) {
      setActionState('priorities', null);
      onToast?.('Failed to update priorities: ' + err.message, 'error');
    }
  };

  const actionsContent = (() => {
    if (insight.type === 'risk') {
      return (
        <div className="swiftly-action-buttons" style={{ marginTop: 10, paddingTop: 10 }}>
          <InsightActionButton
            label="View Items"
            icon={"\u{1F50D}"}
            onClick={handleViewItems}
            loading={actionStates.view === 'loading'}
            done={actionStates.view === 'done'}
          />
          <InsightActionButton
            label="Create Action Plan"
            icon={"\u{1F4CB}"}
            onClick={handleCreateActionPlan}
            loading={actionStates.plan === 'loading'}
            done={actionStates.plan === 'done'}
          />
        </div>
      );
    }

    if (insight.type === 'insight') {
      return (
        <div className="swiftly-action-buttons" style={{ marginTop: 10, paddingTop: 10 }}>
          <InsightActionButton
            label="Send Reminder"
            icon={"\u{1F514}"}
            onClick={handleSendReminder}
            loading={actionStates.reminder === 'loading'}
            done={actionStates.reminder === 'done'}
          />
          <InsightActionButton
            label="Update Priorities"
            icon={"\u{1F4CA}"}
            onClick={handleUpdatePriorities}
            loading={actionStates.priorities === 'loading'}
            done={actionStates.priorities === 'done'}
          />
        </div>
      );
    }

    if (insight.type === 'recommendation') {
      return (
        <div className="swiftly-action-buttons" style={{ marginTop: 10, paddingTop: 10 }}>
          <InsightActionButton
            label="View Items"
            icon={"\u{1F50D}"}
            onClick={handleViewItems}
            loading={actionStates.view === 'loading'}
            done={actionStates.view === 'done'}
          />
          <InsightActionButton
            label="Send Reminder"
            icon={"\u{1F514}"}
            onClick={handleSendReminder}
            loading={actionStates.reminder === 'loading'}
            done={actionStates.reminder === 'done'}
          />
        </div>
      );
    }

    return null;
  })();

  return (
    <>
      {actionsContent}
      {viewItems && (
        <ItemsModal
          items={viewItems}
          boardName={insight.board || 'Board'}
          onClose={() => setViewItems(null)}
        />
      )}
    </>
  );
}

function InsightCards({ insights, onToast, token }) {
  if (!insights || insights.length === 0) return null;

  return (
    <div className="swiftly-card">
      <div className="swiftly-card-header">
        <span className="swiftly-card-title">AI Insights</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {insights.map((insight, i) => (
          <div key={i} className={`swiftly-insight swiftly-insight--${insight.type}`}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{insight.title}</div>
              <div style={{ fontSize: 13, color: 'var(--swiftly-text-secondary)' }}>{insight.description}</div>
              {insight.board && (
                <div style={{ fontSize: 12, color: 'var(--swiftly-text-secondary)', marginTop: 4 }}>
                  Board: {insight.board}
                </div>
              )}
              <InsightActions
                insight={insight}
                token={token}
                onToast={onToast}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default InsightCards;
