import React from 'react';

const COLUMN_COLORS = {
  inProgress: '#0073ea',
  done: '#00ca72',
};

// Sprint Metric Card
function MetricCard({ label, value, color, subtitle }) {
  return (
    <div className="swiftly-card swiftly-stat">
      <div className="swiftly-stat-value" style={{ color: color || 'var(--swiftly-primary)' }}>
        {value}
      </div>
      <div className="swiftly-stat-label">{label}</div>
      {subtitle && (
        <div style={{ fontSize: 11, color: 'var(--swiftly-text-secondary)', marginTop: 2 }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}

function VelocityMetrics({ totalPoints, completedPoints, totalCount, doneCount, velocity, progress, stuckCount }) {
  return (
    <div className="swiftly-grid swiftly-grid-4" style={{ marginBottom: 16 }}>
      <MetricCard
        label="Total Story Points"
        value={totalPoints || '\u2014'}
        color="var(--swiftly-primary)"
        subtitle={`Across ${totalCount} items`}
      />
      <MetricCard
        label="Completed Points"
        value={completedPoints || 0}
        color={COLUMN_COLORS.done}
        subtitle={`${doneCount} items done`}
      />
      <MetricCard
        label="Velocity"
        value={velocity}
        color={COLUMN_COLORS.inProgress}
        subtitle="Items completed"
      />
      <MetricCard
        label="Sprint Progress"
        value={`${progress}%`}
        color={progress >= 75 ? COLUMN_COLORS.done : progress >= 40 ? '#fdab3d' : 'var(--swiftly-danger)'}
        subtitle={stuckCount > 0 ? `${stuckCount} blocked` : 'On track'}
      />
    </div>
  );
}

export default VelocityMetrics;
