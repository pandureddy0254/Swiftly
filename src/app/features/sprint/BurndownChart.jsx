import React, { useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';

const COLUMN_COLORS = {
  inProgress: '#0073ea',
};

function BurndownChart({ totalItems, doneCount, sprintDays }) {
  const days = sprintDays > 0 ? sprintDays : 10;
  const today = Math.min(Math.max(1, Math.floor(days * 0.6)), days); // Simulate mid-sprint

  const data = useMemo(() => {
    const pts = [];
    const rate = doneCount / (today || 1);
    for (let d = 0; d <= days; d++) {
      const ideal = totalItems - (totalItems / days) * d;
      const actual = d <= today ? Math.max(0, totalItems - rate * d) : undefined;
      pts.push({ day: `Day ${d}`, Ideal: Math.round(ideal * 10) / 10, Actual: actual !== undefined ? Math.round(actual * 10) / 10 : undefined });
    }
    return pts;
  }, [totalItems, doneCount, days, today]);

  if (totalItems === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 40, color: 'var(--swiftly-text-secondary)', fontSize: 13 }}>
        No items to chart. Select a board with items to see the burndown.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--swiftly-border)" />
        <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="var(--swiftly-text-secondary)" />
        <YAxis tick={{ fontSize: 12 }} stroke="var(--swiftly-text-secondary)" />
        <Tooltip
          contentStyle={{
            borderRadius: 8, border: '1px solid var(--swiftly-border)',
            boxShadow: 'var(--swiftly-shadow-md)', fontSize: 13,
          }}
        />
        <Legend wrapperStyle={{ fontSize: 13 }} />
        <Line
          type="monotone"
          dataKey="Ideal"
          stroke="var(--swiftly-text-secondary)"
          strokeDasharray="6 3"
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="Actual"
          stroke={COLUMN_COLORS.inProgress}
          strokeWidth={2.5}
          dot={{ r: 3, fill: COLUMN_COLORS.inProgress }}
          connectNulls={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export default BurndownChart;
