import React, { useMemo } from 'react';
import { formatTimerDisplay } from './timeTrackingUtils';

// ---------------------------------------------------------------------------
// Active Timer Display
// ---------------------------------------------------------------------------
function ActiveTimer({ timer, elapsed, onStop }) {
  if (!timer) return null;

  return (
    <div className="swiftly-card" style={{ borderLeft: '4px solid var(--swiftly-danger)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 20, animation: 'pulse 1.5s infinite' }}>{'\u{1F534}'}</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>{timer.itemName}</div>
            <div style={{ fontSize: 12, color: 'var(--swiftly-text-secondary)' }}>{timer.boardName}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontFamily: 'monospace', fontSize: 28, fontWeight: 700, color: 'var(--swiftly-danger)' }}>
            {formatTimerDisplay(elapsed)}
          </span>
          <button
            className="swiftly-action-btn"
            onClick={onStop}
            style={{ background: 'var(--swiftly-danger)', color: '#fff', border: 'none', padding: '8px 20px', fontSize: 14, fontWeight: 600 }}
          >
            Stop
          </button>
        </div>
      </div>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Quick Start Item List
// ---------------------------------------------------------------------------
function QuickStartList({ items, activeItemId, onStart, loading }) {
  if (loading) {
    return (
      <div className="swiftly-card">
        <div className="swiftly-card-header">
          <span className="swiftly-card-title">Quick Start</span>
        </div>
        <div style={{ textAlign: 'center', padding: 24, color: 'var(--swiftly-text-secondary)' }}>
          <div className="swiftly-spinner" style={{ margin: '0 auto 8px' }} />
          Loading items...
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="swiftly-card">
        <div className="swiftly-card-header">
          <span className="swiftly-card-title">Quick Start</span>
        </div>
        <div style={{ textAlign: 'center', padding: 24, color: 'var(--swiftly-text-secondary)', fontSize: 13 }}>
          Select a board above to see items you can track time for.
        </div>
      </div>
    );
  }

  return (
    <div className="swiftly-card">
      <div className="swiftly-card-header">
        <span className="swiftly-card-title">Quick Start</span>
        <span style={{ fontSize: 12, color: 'var(--swiftly-text-secondary)' }}>Click play to start timer</span>
      </div>
      <div style={{ maxHeight: 280, overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--swiftly-border)', position: 'sticky', top: 0, background: 'var(--swiftly-card-bg, #fff)' }}>
              <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--swiftly-text-secondary)', fontWeight: 500 }}>Item</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--swiftly-text-secondary)', fontWeight: 500 }}>Board</th>
              <th style={{ textAlign: 'center', padding: '8px 12px', color: 'var(--swiftly-text-secondary)', fontWeight: 500, width: 60 }}>Track</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const isActive = activeItemId === item.id;
              return (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--swiftly-border)' }}>
                  <td style={{ padding: '8px 12px', fontWeight: 500 }}>
                    {item.name}
                    {item.isSubitem && (
                      <span style={{ fontSize: 10, marginLeft: 6, color: 'var(--swiftly-primary)', background: 'rgba(0,115,234,0.08)', padding: '1px 6px', borderRadius: 4 }}>
                        subitem
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '8px 12px', color: 'var(--swiftly-text-secondary)' }}>{item.boardName}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                    <button
                      onClick={() => onStart(item)}
                      disabled={isActive}
                      style={{
                        background: 'none', border: 'none', cursor: isActive ? 'default' : 'pointer',
                        fontSize: 20, opacity: isActive ? 0.4 : 1, padding: 2,
                      }}
                      title={isActive ? 'Timer running' : 'Start timer'}
                    >
                      {isActive ? '\u{23F8}\u{FE0F}' : '\u{25B6}\u{FE0F}'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stop and Switch Dialog
// ---------------------------------------------------------------------------
function StopSwitchDialog({ activeTimer, elapsed, pendingStop, stopNote, onStopNoteChange, onConfirm, onCancel }) {
  if (!pendingStop) return null;

  return (
    <div className="swiftly-modal-overlay" onClick={onCancel}>
      <div className="swiftly-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
        <div className="swiftly-modal-header">
          <span className="swiftly-card-title">Stop Current Timer</span>
          <button onClick={onCancel} className="swiftly-modal-close">&times;</button>
        </div>
        <div className="swiftly-modal-body" style={{ padding: 20 }}>
          <p style={{ fontSize: 13, color: 'var(--swiftly-text-secondary)', marginBottom: 12 }}>
            Stop timer for <strong>{activeTimer?.itemName}</strong> ({formatTimerDisplay(elapsed)}) and start tracking <strong>{pendingStop.name}</strong>?
          </p>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--swiftly-text-secondary)', display: 'block', marginBottom: 4 }}>
              Notes (optional)
            </label>
            <input
              type="text"
              value={stopNote}
              onChange={(e) => onStopNoteChange(e.target.value)}
              placeholder="What were you working on?"
              style={{
                width: '100%', padding: '8px 12px', fontSize: 13, border: '1px solid var(--swiftly-border)',
                borderRadius: 6, outline: 'none', boxSizing: 'border-box',
              }}
              onKeyDown={(e) => { if (e.key === 'Enter') onConfirm(); }}
              autoFocus
            />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="swiftly-action-btn" onClick={onCancel}>Cancel</button>
            <button
              className="swiftly-action-btn"
              onClick={onConfirm}
              style={{ background: 'var(--swiftly-primary)', color: '#fff', border: 'none' }}
            >
              Stop &amp; Switch
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export { ActiveTimer, QuickStartList, StopSwitchDialog };
export default ActiveTimer;
