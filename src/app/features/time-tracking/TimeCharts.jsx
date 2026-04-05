import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatDuration, getWeekStart, getMonthStart, CHART_COLORS } from './timeTrackingUtils';

// ---------------------------------------------------------------------------
// Board Summary Bars
// ---------------------------------------------------------------------------
function BoardSummary({ logs, viewRange }) {
  const filtered = useMemo(() => {
    const now = new Date();
    const start = viewRange === 'week' ? getWeekStart(now) : getMonthStart(now);
    return logs.filter((log) => new Date(log.date) >= start);
  }, [logs, viewRange]);

  const totalMs = filtered.reduce((sum, l) => sum + l.duration, 0);

  const byBoard = useMemo(() => {
    const map = {};
    filtered.forEach((log) => {
      if (!map[log.boardName]) map[log.boardName] = { name: log.boardName, ms: 0 };
      map[log.boardName].ms += log.duration;
    });
    return Object.values(map).sort((a, b) => b.ms - a.ms);
  }, [filtered]);

  const maxMs = byBoard.length > 0 ? byBoard[0].ms : 1;

  return (
    <div className="swiftly-card">
      <div className="swiftly-card-header">
        <span className="swiftly-card-title">Summary</span>
        <span style={{ fontSize: 13, fontWeight: 600 }}>
          {viewRange === 'week' ? 'This Week' : 'This Month'}: {formatDuration(totalMs)}
        </span>
      </div>
      {byBoard.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 20, color: 'var(--swiftly-text-secondary)', fontSize: 13 }}>
          No time logged yet for this period.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {byBoard.map((board, i) => {
            const pct = Math.max((board.ms / maxMs) * 100, 4);
            const color = CHART_COLORS[i % CHART_COLORS.length];
            return (
              <div key={board.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ height: 22, borderRadius: 4, background: 'var(--swiftly-border)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4, transition: 'width 0.4s ease' }} />
                  </div>
                </div>
                <span style={{ fontSize: 13, fontWeight: 500, minWidth: 160, textAlign: 'right' }}>
                  {board.name}: {formatDuration(board.ms)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Subitem Time Rollup
// ---------------------------------------------------------------------------
function SubitemRollup({ logs }) {
  const rollup = useMemo(() => {
    const parentMap = {};
    logs.forEach((log) => {
      const parentId = log.parentItemId || log.itemId;
      const parentName = log.parentItemName || log.itemName;
      if (!parentMap[parentId]) {
        parentMap[parentId] = { name: parentName, boardName: log.boardName, total: 0, own: 0, subitemTime: 0, subitems: {} };
      }
      if (log.parentItemId && log.parentItemId !== log.itemId) {
        parentMap[parentId].subitemTime += log.duration;
        if (!parentMap[parentId].subitems[log.itemId]) {
          parentMap[parentId].subitems[log.itemId] = { name: log.itemName, ms: 0 };
        }
        parentMap[parentId].subitems[log.itemId].ms += log.duration;
      } else {
        parentMap[parentId].own += log.duration;
      }
      parentMap[parentId].total += log.duration;
    });
    return Object.values(parentMap)
      .filter((p) => p.subitemTime > 0)
      .sort((a, b) => b.total - a.total);
  }, [logs]);

  if (rollup.length === 0) return null;

  return (
    <div className="swiftly-card">
      <div className="swiftly-card-header">
        <span className="swiftly-card-title">Subitem Time Rollup</span>
        <span style={{ fontSize: 12, color: 'var(--swiftly-text-secondary)' }}>Aggregated from subitems to parents</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {rollup.map((parent) => (
          <div key={parent.name} style={{ padding: '10px 12px', background: 'rgba(0,115,234,0.03)', borderRadius: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>{parent.name}</span>
              <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--swiftly-primary)' }}>{formatDuration(parent.total)}</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--swiftly-text-secondary)', marginBottom: 4 }}>
              Own: {formatDuration(parent.own)} | Subitems: {formatDuration(parent.subitemTime)}
            </div>
            <div style={{ paddingLeft: 16 }}>
              {Object.values(parent.subitems).map((si) => (
                <div key={si.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--swiftly-text-secondary)', padding: '2px 0' }}>
                  <span>{'\u2514'} {si.name}</span>
                  <span>{formatDuration(si.ms)}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Weekly/Monthly Bar Chart
// ---------------------------------------------------------------------------
function TimeChart({ logs, viewRange }) {
  const chartData = useMemo(() => {
    const now = new Date();
    if (viewRange === 'week') {
      const weekStart = getWeekStart(now);
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const buckets = days.map((name, i) => {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + i);
        return { name, date: d.toDateString(), hours: 0 };
      });
      logs.forEach((log) => {
        const logDate = new Date(log.date).toDateString();
        const bucket = buckets.find((b) => b.date === logDate);
        if (bucket) bucket.hours += log.duration / 3600000;
      });
      return buckets.map((b) => ({ name: b.name, hours: Math.round(b.hours * 100) / 100 }));
    } else {
      const monthStart = getMonthStart(now);
      const weeks = [];
      const tempDate = new Date(monthStart);
      let weekNum = 1;
      while (tempDate.getMonth() === now.getMonth()) {
        const wStart = new Date(tempDate);
        const wEnd = new Date(tempDate);
        wEnd.setDate(wEnd.getDate() + 6);
        weeks.push({ name: `Wk ${weekNum}`, start: wStart, end: wEnd, hours: 0 });
        tempDate.setDate(tempDate.getDate() + 7);
        weekNum++;
      }
      logs.forEach((log) => {
        const logDate = new Date(log.date);
        const week = weeks.find((w) => logDate >= w.start && logDate <= w.end);
        if (week) week.hours += log.duration / 3600000;
      });
      return weeks.map((w) => ({ name: w.name, hours: Math.round(w.hours * 100) / 100 }));
    }
  }, [logs, viewRange]);

  return (
    <div className="swiftly-card">
      <div className="swiftly-card-header">
        <span className="swiftly-card-title">{viewRange === 'week' ? 'This Week' : 'This Month'}</span>
      </div>
      {chartData.every((d) => d.hours === 0) ? (
        <div style={{ textAlign: 'center', padding: 24, color: 'var(--swiftly-text-secondary)', fontSize: 13 }}>
          No time data to chart for this period.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--swiftly-border)" />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--swiftly-text-secondary)' }} />
            <YAxis tick={{ fontSize: 12, fill: 'var(--swiftly-text-secondary)' }} unit="h" />
            <Tooltip
              formatter={(value) => [`${value}h`, 'Hours']}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--swiftly-border)' }}
            />
            <Bar dataKey="hours" fill="var(--swiftly-primary)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export { BoardSummary, SubitemRollup, TimeChart };
export default TimeChart;
