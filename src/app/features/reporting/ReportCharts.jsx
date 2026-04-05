import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';

const CHART_COLORS = ['#0073ea', '#00ca72', '#fdab3d', '#e2445c', '#579bfc', '#a25ddc', '#037f4c', '#ff5ac4'];

function ChartEmptyState({ message }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: 280,
      color: 'var(--swiftly-text-secondary)',
      fontSize: 14,
      textAlign: 'center',
      padding: 20,
    }}>
      <div>
        <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.4 }}>{"\u{1F4CA}"}</div>
        <p>{message}</p>
      </div>
    </div>
  );
}

function ReportCharts({ reportData }) {
  const barChartData = reportData?.boards?.map((b) => {
    const boardName = b.name || b.boardName || `Board ${b.id}`;
    return {
      name: boardName.length > 20 ? boardName.slice(0, 20) + '...' : boardName,
      progress: b.progress,
      items: b.totalItems,
    };
  }) || [];

  const statusEntries = reportData ? Object.entries(reportData.statusBreakdown) : [];
  const pieChartData = statusEntries.map(([name, value]) => ({ name, value }));

  return (
    <div className="swiftly-grid swiftly-grid-2">
      {/* Board Progress Bar Chart */}
      <div className="swiftly-card">
        <div className="swiftly-card-header">
          <span className="swiftly-card-title">Board Progress</span>
        </div>
        {barChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={barChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--swiftly-border)" />
              <XAxis dataKey="name" fontSize={12} tick={{ fill: '#676879' }} />
              <YAxis domain={[0, 100]} fontSize={12} tick={{ fill: '#676879' }} tickFormatter={(v) => `${v}%`} />
              <Tooltip
                formatter={(value, name) => name === 'progress' ? [`${value}%`, 'Progress'] : [value, name]}
                contentStyle={{ borderRadius: 8, border: '1px solid #e6e9ef', fontSize: 13 }}
              />
              <Bar dataKey="progress" fill="#0073ea" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <ChartEmptyState message="No board data available. Select boards and generate a report to see progress." />
        )}
      </div>

      {/* Status Pie Chart */}
      <div className="swiftly-card">
        <div className="swiftly-card-header">
          <span className="swiftly-card-title">Status Distribution</span>
        </div>
        {pieChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={pieChartData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={90}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={true}
              >
                {pieChartData.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e6e9ef', fontSize: 13 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <ChartEmptyState message="No status columns found on the selected boards. Add status columns to your boards to see distribution." />
        )}
      </div>
    </div>
  );
}

export default ReportCharts;
