import React, { useMemo } from 'react';
import { formatDuration } from './timeTrackingUtils';

// ---------------------------------------------------------------------------
// Billable Hours Summary
// ---------------------------------------------------------------------------
function TimeSummary({ logs }) {
  const stats = useMemo(() => {
    let billable = 0;
    let nonBillable = 0;
    logs.forEach((log) => {
      if (log.billable) billable += log.duration;
      else nonBillable += log.duration;
    });
    return { billable, nonBillable, total: billable + nonBillable };
  }, [logs]);

  return (
    <div className="swiftly-grid swiftly-grid-3">
      <div className="swiftly-card swiftly-stat">
        <div className="swiftly-stat-value" style={{ color: 'var(--swiftly-primary)' }}>{formatDuration(stats.total)}</div>
        <div className="swiftly-stat-label">Total Logged</div>
      </div>
      <div className="swiftly-card swiftly-stat">
        <div className="swiftly-stat-value" style={{ color: 'var(--swiftly-success)' }}>{formatDuration(stats.billable)}</div>
        <div className="swiftly-stat-label">Billable</div>
      </div>
      <div className="swiftly-card swiftly-stat">
        <div className="swiftly-stat-value" style={{ color: 'var(--swiftly-warning)' }}>{formatDuration(stats.nonBillable)}</div>
        <div className="swiftly-stat-label">Non-Billable</div>
      </div>
    </div>
  );
}

export default TimeSummary;
