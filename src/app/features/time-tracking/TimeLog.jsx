import React, { useMemo } from 'react';
import { formatDuration, formatDate } from './timeTrackingUtils';

// ---------------------------------------------------------------------------
// Time Log Table
// ---------------------------------------------------------------------------
function TimeLog({ logs, onToggleBillable, onDeleteLog }) {
  const sorted = useMemo(() => [...logs].sort((a, b) => new Date(b.date) - new Date(a.date)), [logs]);

  if (sorted.length === 0) {
    return (
      <div className="swiftly-card">
        <div className="swiftly-card-header">
          <span className="swiftly-card-title">Time Log</span>
        </div>
        <div style={{ textAlign: 'center', padding: 24, color: 'var(--swiftly-text-secondary)', fontSize: 13 }}>
          No entries yet. Start a timer to begin logging time.
        </div>
      </div>
    );
  }

  return (
    <div className="swiftly-card">
      <div className="swiftly-card-header">
        <span className="swiftly-card-title">Time Log</span>
        <span style={{ fontSize: 12, color: 'var(--swiftly-text-secondary)' }}>{sorted.length} entries</span>
      </div>
      <div style={{ maxHeight: 360, overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--swiftly-border)', position: 'sticky', top: 0, background: 'var(--swiftly-card-bg, #fff)' }}>
              <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--swiftly-text-secondary)', fontWeight: 500 }}>Date</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--swiftly-text-secondary)', fontWeight: 500 }}>Item</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--swiftly-text-secondary)', fontWeight: 500 }}>Time</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--swiftly-text-secondary)', fontWeight: 500 }}>Board</th>
              <th style={{ textAlign: 'center', padding: '8px 12px', color: 'var(--swiftly-text-secondary)', fontWeight: 500 }}>Bill?</th>
              <th style={{ textAlign: 'center', padding: '8px 12px', color: 'var(--swiftly-text-secondary)', fontWeight: 500, width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((log) => (
              <tr key={log.id} style={{ borderBottom: '1px solid var(--swiftly-border)' }}>
                <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>{formatDate(log.date)}</td>
                <td style={{ padding: '8px 12px', fontWeight: 500 }}>
                  {log.itemName}
                  {log.notes && (
                    <div style={{ fontSize: 11, color: 'var(--swiftly-text-secondary)', marginTop: 2 }}>{log.notes}</div>
                  )}
                </td>
                <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontWeight: 500 }}>{formatDuration(log.duration)}</td>
                <td style={{ padding: '8px 12px', color: 'var(--swiftly-text-secondary)' }}>{log.boardName}</td>
                <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                  <button
                    onClick={() => onToggleBillable(log.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}
                    title={log.billable ? 'Mark non-billable' : 'Mark billable'}
                  >
                    {log.billable ? '\u2705' : '\u2B1C'}
                  </button>
                </td>
                <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                  <button
                    onClick={() => onDeleteLog(log.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--swiftly-text-secondary)' }}
                    title="Delete entry"
                  >
                    {'\u{1F5D1}'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default TimeLog;
