import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import * as api from '@core/api/swiftly-client';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const STALE_DAYS = 7;
const SEVERITY_COLORS = {
  critical: 'var(--swiftly-danger)',
  warning: 'var(--swiftly-warning)',
  info: 'var(--swiftly-primary)',
  success: 'var(--swiftly-success)',
};

function daysSince(dateStr) {
  if (!dateStr) return Infinity;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
}

function progressClass(pct) {
  if (pct >= 75) return 'swiftly-progress-fill--success';
  if (pct >= 40) return 'swiftly-progress-fill--warning';
  return 'swiftly-progress-fill--danger';
}

function scoreColor(score) {
  if (score >= 75) return 'var(--swiftly-success)';
  if (score >= 50) return 'var(--swiftly-warning)';
  return 'var(--swiftly-danger)';
}

/** Resolve board name from various field patterns */
function resolveBoardName(board) {
  return board?.name || board?.boardName || board?.board_name || `Board ${board?.id || '?'}`;
}

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------
function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className={`swiftly-toast swiftly-toast--${type}`}>
      {type === 'success' ? '\u2705' : '\u274C'} {message}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Action Button (reusable)
// ---------------------------------------------------------------------------
function ActionBtn({ label, icon, onClick, loading, done }) {
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

// ---------------------------------------------------------------------------
// Health Gauge (circular SVG) with breakdown tooltip
// ---------------------------------------------------------------------------
function HealthGauge({ score, breakdown }) {
  const [showTip, setShowTip] = useState(false);
  const radius = 70;
  const stroke = 10;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = scoreColor(score);

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}
      onMouseEnter={() => setShowTip(true)}
      onMouseLeave={() => setShowTip(false)}
    >
      <svg width={180} height={180} viewBox="0 0 180 180">
        <circle
          cx="90" cy="90" r={radius}
          fill="none" stroke="var(--swiftly-border)" strokeWidth={stroke}
        />
        <circle
          cx="90" cy="90" r={radius}
          fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 90 90)"
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
        <text x="90" y="82" textAnchor="middle" fontSize="36" fontWeight="700" fill={color}>
          {score}
        </text>
        <text x="90" y="108" textAnchor="middle" fontSize="13" fill="var(--swiftly-text-secondary)">
          Health Score
        </text>
      </svg>
      {showTip && breakdown && (
        <div style={{
          position: 'absolute', bottom: -8, left: '50%', transform: 'translateX(-50%) translateY(100%)',
          background: 'var(--swiftly-card-bg, #fff)', border: '1px solid var(--swiftly-border)',
          borderRadius: 8, padding: '10px 14px', fontSize: 12, zIndex: 10, minWidth: 200,
          boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
        }}>
          {breakdown.map((b) => (
            <div key={b.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '2px 0' }}>
              <span style={{ color: 'var(--swiftly-text-secondary)' }}>{b.label}</span>
              <span style={{ fontWeight: 600 }}>{b.points}/{b.max}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------
function DashboardSkeleton() {
  const bar = (w) => (
    <div style={{
      height: 14, width: w, borderRadius: 4,
      background: 'linear-gradient(90deg, var(--swiftly-border) 25%, #f0f1f5 50%, var(--swiftly-border) 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.4s ease infinite',
    }} />
  );

  return (
    <div>
      <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
      <div className="swiftly-card" style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
        <div style={{ width: 180, height: 180, borderRadius: '50%', background: 'var(--swiftly-border)', opacity: 0.4 }} />
      </div>
      <div className="swiftly-grid swiftly-grid-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="swiftly-card swiftly-stat" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            {bar('60%')}
            {bar('40%')}
          </div>
        ))}
      </div>
      {[1, 2].map((i) => (
        <div key={i} className="swiftly-card" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 24 }}>
          {bar('45%')}
          {bar('80%')}
          {bar('60%')}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Suggestion Card
// ---------------------------------------------------------------------------
function SuggestionCard({ suggestion, token, onToast }) {
  const [states, setStates] = useState({});
  const set = (k, v) => setStates((p) => ({ ...p, [k]: v }));

  const exec = async (key, fn) => {
    set(key, 'loading');
    try {
      await fn();
      set(key, 'done');
      onToast('Action completed successfully', 'success');
    } catch (err) {
      set(key, null);
      onToast('Action failed: ' + err.message, 'error');
    }
  };

  const severityClass = suggestion.severity === 'critical' ? 'risk'
    : suggestion.severity === 'warning' ? 'insight'
    : 'recommendation';

  return (
    <div className={`swiftly-insight swiftly-insight--${severityClass}`}>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{suggestion.title}</div>
        <div style={{ fontSize: 13, color: 'var(--swiftly-text-secondary)' }}>{suggestion.description}</div>
        {suggestion.board && suggestion.board !== 'Unknown' && (
          <div style={{ fontSize: 12, color: 'var(--swiftly-text-secondary)', marginTop: 4 }}>Board: {suggestion.board}</div>
        )}
        {suggestion.actions && suggestion.actions.length > 0 && (
          <div className="swiftly-action-buttons" style={{ marginTop: 10, paddingTop: 10 }}>
            {suggestion.actions.map((action) => (
              <ActionBtn
                key={action.key}
                label={action.label}
                icon={action.icon}
                loading={states[action.key] === 'loading'}
                done={states[action.key] === 'done'}
                onClick={() => exec(action.key, () => action.handler(token))}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Board Overview Mini-Card (enhanced)
// ---------------------------------------------------------------------------
function BoardMiniCard({ board, items, token, onToast }) {
  const [showItems, setShowItems] = useState(false);
  const boardName = resolveBoardName(board);
  const subItemCount = (items || []).reduce((sum, it) => sum + (it.subitems?.length || 0), 0);
  const topItems = (items || []).slice(0, 3);
  const urgentItems = (items || [])
    .filter((it) => {
      const status = it.column_values?.find((c) => c.type === 'status');
      return status?.text === 'Stuck' || status?.text === 'Critical' || daysSince(it.updated_at) > STALE_DAYS;
    })
    .slice(0, 3);

  return (
    <div className="swiftly-card" style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontWeight: 600, fontSize: 14 }}>{boardName}</span>
        <span style={{ fontSize: 12, color: 'var(--swiftly-text-secondary)' }}>
          {board.totalItems} items{subItemCount > 0 ? ` / ${subItemCount} subs` : ''}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div className="swiftly-progress" style={{ flex: 1 }}>
          <div className={`swiftly-progress-fill ${progressClass(board.progress || 0)}`} style={{ width: `${board.progress || 0}%` }} />
        </div>
        <span style={{ fontSize: 13, fontWeight: 600, minWidth: 36 }}>{board.progress || 0}%</span>
      </div>

      {/* Top items preview */}
      {topItems.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          {topItems.map((it) => (
            <div key={it.id} style={{ fontSize: 12, color: 'var(--swiftly-text-secondary)', padding: '2px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {it.name}
            </div>
          ))}
        </div>
      )}

      {urgentItems.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--swiftly-danger)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Needs Attention
          </div>
          {urgentItems.map((it) => (
            <div key={it.id} style={{ fontSize: 12, color: 'var(--swiftly-text-secondary)', padding: '2px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {it.name}
            </div>
          ))}
        </div>
      )}

      <button
        className="swiftly-action-btn"
        style={{ fontSize: 11, padding: '4px 10px', width: '100%', justifyContent: 'center' }}
        onClick={() => setShowItems(!showItems)}
      >
        {showItems ? 'Hide Details' : 'View Details'}
      </button>

      {showItems && items && (
        <div style={{ marginTop: 10, maxHeight: 200, overflowY: 'auto', fontSize: 12 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--swiftly-border)' }}>
                <th style={{ textAlign: 'left', padding: '4px 6px', color: 'var(--swiftly-text-secondary)', fontWeight: 500 }}>Item</th>
                <th style={{ textAlign: 'center', padding: '4px 6px', color: 'var(--swiftly-text-secondary)', fontWeight: 500 }}>Status</th>
                <th style={{ textAlign: 'center', padding: '4px 6px', color: 'var(--swiftly-text-secondary)', fontWeight: 500 }}>Assignee</th>
              </tr>
            </thead>
            <tbody>
              {items.slice(0, 20).map((it) => {
                const status = it.column_values?.find((c) => c.type === 'status');
                const person = it.column_values?.find((c) => c.type === 'people' || c.type === 'multiple-person');
                return (
                  <tr key={it.id} style={{ borderBottom: '1px solid var(--swiftly-border)' }}>
                    <td style={{ padding: '4px 6px' }}>{it.name}</td>
                    <td style={{ padding: '4px 6px', textAlign: 'center' }}>{status?.text || '-'}</td>
                    <td style={{ padding: '4px 6px', textAlign: 'center', fontSize: 11 }}>{person?.text || '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Activity Timeline
// ---------------------------------------------------------------------------
function ActivityTimeline({ allItems }) {
  const events = allItems
    .flatMap((it) => {
      const out = [];
      if (it.created_at) out.push({ date: it.created_at, item: it.name, type: 'created', board: it._boardName });
      if (it.updated_at && it.updated_at !== it.created_at) out.push({ date: it.updated_at, item: it.name, type: 'updated', board: it._boardName });
      return out;
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 20);

  if (events.length === 0) return null;

  return (
    <div className="swiftly-card">
      <div className="swiftly-card-header">
        <span className="swiftly-card-title">Recent Activity</span>
        <span style={{ fontSize: 12, color: 'var(--swiftly-text-secondary)' }}>{events.length} events</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {events.map((ev, i) => (
          <div key={i} style={{
            display: 'flex', gap: 12, padding: '8px 0',
            borderBottom: i < events.length - 1 ? '1px solid var(--swiftly-border)' : 'none',
            alignItems: 'flex-start',
          }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%', marginTop: 6, flexShrink: 0,
              background: ev.type === 'created' ? 'var(--swiftly-success)' : 'var(--swiftly-primary)',
            }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {ev.item}
              </div>
              <div style={{ fontSize: 11, color: 'var(--swiftly-text-secondary)' }}>
                {ev.type === 'created' ? 'Created' : 'Updated'} &middot; {ev.board || 'Board'} &middot; {new Date(ev.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Quick Actions Bar
// ---------------------------------------------------------------------------
function QuickActions() {
  const actions = [
    { label: 'Generate Report', icon: '\uD83D\uDCCA', tab: 'reports' },
    { label: 'Ask AI', icon: '\uD83E\uDD16', tab: 'ai-agent' },
    { label: 'Start Timer', icon: '\u23F1\uFE0F', tab: 'time-tracking' },
    { label: 'View Sprint', icon: '\uD83C\uDFC3', tab: 'sprint' },
  ];

  const handleClick = (tab) => {
    try {
      localStorage.setItem('swiftly-desired-tab', tab);
      window.parent.postMessage({ type: 'swiftly-switch-tab', tab }, '*');
    } catch { /* noop */ }
  };

  return (
    <div className="swiftly-card">
      <div className="swiftly-card-header">
        <span className="swiftly-card-title">Quick Actions</span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {actions.map((a) => (
          <button
            key={a.tab}
            className="swiftly-action-btn"
            style={{ fontSize: 12, padding: '8px 16px' }}
            onClick={() => handleClick(a.tab)}
          >
            <span>{a.icon}</span> {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Health Score Calculation (weighted, with breakdown)
// ---------------------------------------------------------------------------
function calculateHealthScore(reportData, allItems) {
  const breakdown = [];
  if (!reportData || allItems.length === 0) {
    return { score: 0, breakdown: [] };
  }

  let score = 0;
  const total = allItems.length || 1;

  // +15: boards have items at all
  const hasItemsPts = Math.min(15, allItems.length > 0 ? 15 : 0);
  score += hasItemsPts;
  breakdown.push({ label: 'Has items', points: hasItemsPts, max: 15 });

  // +20: items with status columns configured
  const withStatus = allItems.filter((it) => {
    const s = it.column_values?.find((c) => c.type === 'status');
    return s && s.text;
  }).length;
  const statusPts = Math.round((withStatus / total) * 20);
  score += statusPts;
  breakdown.push({ label: 'Statuses set', points: statusPts, max: 20 });

  // +20: items with assignees
  const withAssignee = allItems.filter((it) => {
    const p = it.column_values?.find((c) => c.type === 'people' || c.type === 'multiple-person');
    return p && p.text;
  }).length;
  const assigneePts = Math.round((withAssignee / total) * 20);
  score += assigneePts;
  breakdown.push({ label: 'Assignees', points: assigneePts, max: 20 });

  // +20: items with due dates
  const withDueDate = allItems.filter((it) => {
    const d = it.column_values?.find((c) => c.type === 'date' || c.type === 'timeline');
    return d && d.text;
  }).length;
  const datePts = Math.round((withDueDate / total) * 20);
  score += datePts;
  breakdown.push({ label: 'Due dates', points: datePts, max: 20 });

  // +15: items completed
  const completed = reportData.completedItems || 0;
  const completedPts = Math.round((completed / total) * 15);
  score += completedPts;
  breakdown.push({ label: 'Completion', points: completedPts, max: 15 });

  // +10: items updated in last 7 days
  const recentlyUpdated = allItems.filter((it) => daysSince(it.updated_at) <= STALE_DAYS).length;
  const recentPts = Math.round((recentlyUpdated / total) * 10);
  score += recentPts;
  breakdown.push({ label: 'Recent activity', points: recentPts, max: 10 });

  return { score: Math.min(100, Math.max(0, score)), breakdown };
}

// ---------------------------------------------------------------------------
// Rule-based Suggestion Engine
// ---------------------------------------------------------------------------
function generateSuggestions(reportData, allItems, boardItemsMap) {
  const suggestions = [];
  if (!reportData || allItems.length === 0) return suggestions;

  // Items with no status
  const noStatus = allItems.filter((it) => {
    const s = it.column_values?.find((c) => c.type === 'status');
    return !s || !s.text;
  });
  if (noStatus.length > 0) {
    suggestions.push({
      id: 'no-status',
      title: `${noStatus.length} item${noStatus.length > 1 ? 's' : ''} have no status`,
      description: 'Items without a status column make it impossible to track progress. Add or configure a Status column on these boards.',
      severity: 'warning',
      actions: noStatus.slice(0, 3).map((it) => ({
        key: `set-status-${it.id}`,
        label: `Update "${it.name.slice(0, 20)}"`,
        icon: '\uD83D\uDD04',
        handler: async (token) => {
          await api.updateItem(token, it._boardId, it.id, { status: { label: 'Working on it' } });
        },
      })),
    });
  }

  // Items with no assignee
  const noAssignee = allItems.filter((it) => {
    const p = it.column_values?.find((c) => c.type === 'people' || c.type === 'multiple-person');
    return !p || !p.text;
  });
  if (noAssignee.length > 0) {
    suggestions.push({
      id: 'no-assignee',
      title: `${noAssignee.length} item${noAssignee.length > 1 ? 's' : ''} unassigned`,
      description: 'Unassigned items risk being overlooked. Consider distributing these across your team.',
      severity: 'warning',
      actions: [{
        key: 'view-unassigned',
        label: 'View Unassigned Items',
        icon: '\uD83D\uDC65',
        handler: async () => { /* no-op, visual only */ },
      }],
    });
  }

  // Stale items (not updated in 7+ days)
  const staleItems = allItems.filter((it) => daysSince(it.updated_at) > STALE_DAYS);
  if (staleItems.length > 0) {
    suggestions.push({
      id: 'stale-items',
      title: `${staleItems.length} item${staleItems.length > 1 ? 's' : ''} stale (7+ days)`,
      description: 'These items have not been updated recently and may be blocked or forgotten.',
      severity: 'critical',
      actions: [
        ...staleItems.slice(0, 2).map((it) => ({
          key: `mark-stuck-${it.id}`,
          label: `Mark "${it.name.slice(0, 18)}" Stuck`,
          icon: '\u26A0\uFE0F',
          handler: async (token) => {
            await api.updateItem(token, it._boardId, it.id, { status: { label: 'Stuck' } });
          },
        })),
        {
          key: 'remind-stale',
          label: 'Create Reminder',
          icon: '\uD83D\uDD14',
          handler: async (token) => {
            const boardId = staleItems[0]._boardId;
            await api.createItem(token, boardId, `[Reminder] ${staleItems.length} stale items need attention`, {}, null);
          },
        },
      ],
    });
  }

  // Zero completed items
  if ((reportData.completedItems || 0) === 0 && allItems.length > 0) {
    suggestions.push({
      id: 'zero-completed',
      title: 'No items completed yet',
      description: 'None of the items across selected boards are marked as Done. Start marking progress to track your team velocity.',
      severity: 'info',
      actions: [{
        key: 'mark-first-done',
        label: 'Mark Progress Tips',
        icon: '\u2705',
        handler: async () => {},
      }],
    });
  }

  // Missing due dates
  const noDueDate = allItems.filter((it) => {
    const d = it.column_values?.find((c) => c.type === 'date' || c.type === 'timeline');
    return !d || !d.text;
  });
  if (noDueDate.length > 0) {
    suggestions.push({
      id: 'no-due-date',
      title: `${noDueDate.length} item${noDueDate.length > 1 ? 's' : ''} have no deadline`,
      description: 'Items without due dates are hard to prioritize and may slip through the cracks.',
      severity: 'warning',
      actions: [{
        key: 'set-dates-reminder',
        label: 'Create Date Reminder',
        icon: '\uD83D\uDCC5',
        handler: async (token) => {
          const boardId = noDueDate[0]._boardId;
          await api.createItem(token, boardId, `[Action] Set due dates for ${noDueDate.length} items`, {}, null);
        },
      }],
    });
  }

  // Workload imbalance
  const assigneeCounts = {};
  allItems.forEach((it) => {
    const p = it.column_values?.find((c) => c.type === 'people' || c.type === 'multiple-person');
    if (p && p.text) {
      const name = p.text;
      assigneeCounts[name] = (assigneeCounts[name] || 0) + 1;
    }
  });
  const counts = Object.values(assigneeCounts);
  if (counts.length >= 2) {
    const max = Math.max(...counts);
    const min = Math.min(...counts);
    if (max > min * 2) {
      const heaviest = Object.entries(assigneeCounts).sort((a, b) => b[1] - a[1])[0];
      const lightest = Object.entries(assigneeCounts).sort((a, b) => a[1] - b[1])[0];
      suggestions.push({
        id: 'workload-imbalance',
        title: 'Workload imbalance detected',
        description: `${heaviest[0]} has ${heaviest[1]} tasks while ${lightest[0]} has ${lightest[1]}. Consider redistributing work for better balance.`,
        severity: 'warning',
        actions: [{
          key: 'redistribute',
          label: 'Create Redistribution Plan',
          icon: '\u2696\uFE0F',
          handler: async (token) => {
            const boardId = allItems[0]._boardId;
            await api.createItem(token, boardId, `[Action] Redistribute workload: ${heaviest[0]} (${heaviest[1]}) -> ${lightest[0]} (${lightest[1]})`, {}, null);
          },
        }],
      });
    }
  }

  // Board has only one group
  if (reportData.boards) {
    reportData.boards.forEach((board) => {
      const bName = resolveBoardName(board);
      if (board.groups && board.groups.length <= 1 && board.totalItems > 5) {
        suggestions.push({
          id: `single-group-${board.id}`,
          title: `"${bName}" has all items in one group`,
          description: 'Organizing items into groups (phases, sprints, categories) improves visibility and planning.',
          severity: 'info',
          board: bName,
          actions: [{
            key: `organize-${board.id}`,
            label: 'Create Organization Plan',
            icon: '\uD83D\uDCC1',
            handler: async (token) => {
              await api.createItem(token, board.id, '[Action] Organize board items into groups/phases', {}, null);
            },
          }],
        });
      }
    });
  }

  return suggestions;
}

// ---------------------------------------------------------------------------
// Main DashboardView Component
// ---------------------------------------------------------------------------
function DashboardView({ token, currentBoardId }) {
  const [boards, setBoards] = useState([]);
  const [selectedBoardIds, setSelectedBoardIds] = useState([]);
  const [reportData, setReportData] = useState(null);
  const [aiInsightsData, setAiInsightsData] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [healthScore, setHealthScore] = useState(0);
  const [healthBreakdown, setHealthBreakdown] = useState([]);
  const [boardItems, setBoardItems] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingBoards, setLoadingBoards] = useState(true);
  const [toast, setToast] = useState(null);
  const [error, setError] = useState(null);
  const loadRef = useRef(0);
  const autoSelectedRef = useRef(false);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
  }, []);

  /** Check if a board is the host "Swiftly" board or empty */
  const isHostOrEmpty = useCallback((board) => {
    const name = (board.name || board.boardName || '').toLowerCase();
    if (name.includes('swiftly')) return true;
    if (String(board.id) === String(currentBoardId) && (board.items_count === 0 || board.totalItems === 0)) return true;
    return false;
  }, [currentBoardId]);

  // Load board list on mount, auto-select boards with items
  useEffect(() => {
    async function loadBoards() {
      try {
        const result = await api.getBoards(token);
        const allBoards = result.boards || [];
        setBoards(allBoards);

        // Auto-select all boards that likely have items, excluding the host board
        if (!autoSelectedRef.current) {
          autoSelectedRef.current = true;
          const eligible = allBoards.filter((b) => !isHostOrEmpty(b));
          if (eligible.length > 0) {
            setSelectedBoardIds(eligible.map((b) => String(b.id)));
          } else if (currentBoardId && !allBoards.find((b) => isHostOrEmpty(b) && String(b.id) === String(currentBoardId))) {
            // Fallback: select current board only if it's not the host
            setSelectedBoardIds([String(currentBoardId)]);
          }
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoadingBoards(false);
      }
    }
    loadBoards();
  }, [token, currentBoardId, isHostOrEmpty]);

  // Auto-load dashboard when boards are selected
  useEffect(() => {
    if (selectedBoardIds.length > 0) {
      loadDashboard();
    } else {
      setReportData(null);
      setAiInsightsData([]);
      setSuggestions([]);
      setHealthScore(0);
      setHealthBreakdown([]);
      setBoardItems({});
    }
  }, [selectedBoardIds]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadDashboard() {
    const loadId = ++loadRef.current;
    setLoading(true);
    setError(null);

    try {
      // 1. Fetch report + AI insights in parallel
      const [reportResult, insightsResult] = await Promise.allSettled([
        api.generateReport(token, selectedBoardIds, {
          tone: 'professional',
          audience: 'manager',
          includeRecommendations: true,
        }),
        api.aiInsights(token, selectedBoardIds),
      ]);

      if (loadId !== loadRef.current) return;

      const report = reportResult.status === 'fulfilled' ? reportResult.value : null;
      const insights = insightsResult.status === 'fulfilled' ? insightsResult.value : null;

      if (!report) {
        setError('Failed to load report data. Please try again.');
        setLoading(false);
        return;
      }

      // Normalize board names in report data
      if (report.data?.boards) {
        report.data.boards = report.data.boards.map((b) => ({
          ...b,
          name: resolveBoardName(b),
        }));
      }

      setReportData(report.data);
      setAiInsightsData([
        ...(report.insights || []),
        ...(insights?.insights || []),
      ]);

      // 2. Fetch raw items per board for timeline + stale detection
      const itemsMap = {};
      const itemFetches = selectedBoardIds.map(async (bid) => {
        try {
          const res = await api.getBoardItems(token, bid);
          const boardMeta = report.data?.boards?.find((b) => String(b.id) === String(bid));
          const boardName = boardMeta ? resolveBoardName(boardMeta) : (boards.find((b) => String(b.id) === String(bid))?.name || `Board ${bid}`);
          itemsMap[bid] = (res.items || []).map((it) => ({
            ...it,
            _boardId: bid,
            _boardName: boardName,
          }));
        } catch {
          itemsMap[bid] = [];
        }
      });
      await Promise.all(itemFetches);

      if (loadId !== loadRef.current) return;

      setBoardItems(itemsMap);

      // 3. Flatten all items
      const allItems = Object.values(itemsMap).flat();

      // 4. Calculate health score with breakdown
      const { score, breakdown } = calculateHealthScore(report.data, allItems);
      setHealthScore(score);
      setHealthBreakdown(breakdown);

      // 5. Generate rule-based suggestions
      const ruleSuggestions = generateSuggestions(report.data, allItems, itemsMap);

      // 6. Merge with AI insights (convert AI insights into suggestion format)
      const aiSuggestions = (report.insights || []).map((ins) => {
        // Resolve board name for AI insight
        const insBoardName = ins.board && ins.board !== 'Unknown'
          ? ins.board
          : ins.boardId
            ? resolveBoardName(report.data?.boards?.find((b) => String(b.id) === String(ins.boardId)) || {})
            : null;
        return {
          id: `ai-${ins.title}`,
          title: ins.title,
          description: ins.description,
          severity: ins.severity === 'high' ? 'critical' : ins.severity === 'medium' ? 'warning' : 'info',
          board: insBoardName,
          actions: ins.boardId ? [
            {
              key: `ai-action-${ins.boardId}-${ins.title}`,
              label: 'Create Action Plan',
              icon: '\uD83D\uDCCB',
              handler: async (token) => {
                await api.createItem(token, ins.boardId, `[Action Plan] ${ins.title}`, {}, null);
              },
            },
            {
              key: `ai-view-${ins.boardId}`,
              label: 'View Board Items',
              icon: '\uD83D\uDD0D',
              handler: async () => {},
            },
          ] : [],
        };
      });

      setSuggestions([...ruleSuggestions, ...aiSuggestions]);
    } catch (err) {
      if (loadId === loadRef.current) {
        setError(err.message);
      }
    } finally {
      if (loadId === loadRef.current) {
        setLoading(false);
      }
    }
  }

  const toggleBoard = useCallback((boardId) => {
    setSelectedBoardIds((prev) =>
      prev.includes(boardId) ? prev.filter((id) => id !== boardId) : [...prev, boardId]
    );
  }, []);

  // Derived data
  const allItems = Object.values(boardItems).flat();
  const atRiskCount = allItems.filter((it) => {
    const s = it.column_values?.find((c) => c.type === 'status');
    return s?.text === 'Stuck' || daysSince(it.updated_at) > STALE_DAYS;
  }).length;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  if (loadingBoards) {
    return (
      <div className="swiftly-loading">
        <div className="swiftly-spinner" />
        Loading boards...
      </div>
    );
  }

  return (
    <div>
      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Board Selector */}
      <div className="swiftly-card">
        <div className="swiftly-card-header">
          <span className="swiftly-card-title">Command Center</span>
          <span style={{ fontSize: 13, color: 'var(--swiftly-text-secondary)' }}>
            {selectedBoardIds.length} board{selectedBoardIds.length !== 1 ? 's' : ''} selected
            {loading && <span style={{ marginLeft: 8 }}>&middot; Analyzing...</span>}
          </span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {boards.map((board) => {
            const isHost = isHostOrEmpty(board);
            return (
              <button
                key={board.id}
                onClick={() => toggleBoard(board.id)}
                className={`swiftly-board-chip ${selectedBoardIds.includes(board.id) ? 'swiftly-board-chip--selected' : ''}`}
                style={isHost ? { opacity: 0.5 } : undefined}
                title={isHost ? 'Host board (auto-excluded)' : board.name}
              >
                {board.name}
              </button>
            );
          })}
          {boards.length === 0 && (
            <span style={{ fontSize: 13, color: 'var(--swiftly-text-secondary)' }}>No boards available</span>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="swiftly-card" style={{ borderLeft: '4px solid var(--swiftly-danger)' }}>
          <p style={{ color: 'var(--swiftly-danger)', fontSize: 14 }}>{error}</p>
          <button className="swiftly-action-btn" style={{ marginTop: 8 }} onClick={() => loadDashboard()}>
            Retry
          </button>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && <DashboardSkeleton />}

      {/* Dashboard Content */}
      {!loading && reportData && (
        <>
          {/* Health Gauge + KPI Row */}
          <div className="swiftly-grid swiftly-grid-2" style={{ alignItems: 'stretch' }}>
            {/* Health Gauge Card */}
            <div className="swiftly-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <HealthGauge score={healthScore} breakdown={healthBreakdown} />
            </div>

            {/* Quick Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="swiftly-card swiftly-stat">
                <div className="swiftly-stat-value">{reportData.totalItems}</div>
                <div className="swiftly-stat-label">Total Items</div>
              </div>
              <div className="swiftly-card swiftly-stat">
                <div className="swiftly-stat-value" style={{ color: 'var(--swiftly-success)' }}>
                  {reportData.completedItems || 0}
                </div>
                <div className="swiftly-stat-label">Completed</div>
              </div>
              <div className="swiftly-card swiftly-stat">
                <div className="swiftly-stat-value" style={{ color: 'var(--swiftly-danger)' }}>
                  {atRiskCount}
                </div>
                <div className="swiftly-stat-label">At Risk</div>
              </div>
              <div className="swiftly-card swiftly-stat">
                <div className="swiftly-stat-value" style={{ color: scoreColor(healthScore) }}>
                  {healthScore}
                </div>
                <div className="swiftly-stat-label">Health Score</div>
              </div>
            </div>
          </div>

          {/* Smart Suggestions */}
          {suggestions.length > 0 && (
            <div className="swiftly-card">
              <div className="swiftly-card-header">
                <span className="swiftly-card-title">Smart Suggestions</span>
                <span style={{ fontSize: 12, color: 'var(--swiftly-text-secondary)' }}>
                  {suggestions.filter((s) => s.severity === 'critical').length} critical &middot;{' '}
                  {suggestions.filter((s) => s.severity === 'warning').length} warnings
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {suggestions
                  .sort((a, b) => {
                    const order = { critical: 0, warning: 1, info: 2, success: 3 };
                    return (order[a.severity] ?? 4) - (order[b.severity] ?? 4);
                  })
                  .map((suggestion) => (
                    <SuggestionCard
                      key={suggestion.id}
                      suggestion={suggestion}
                      token={token}
                      onToast={showToast}
                    />
                  ))}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <QuickActions />

          {/* Status Distribution (compact pie) */}
          {reportData.statusBreakdown && Object.keys(reportData.statusBreakdown).length > 0 && (
            <div className="swiftly-card">
              <div className="swiftly-card-header">
                <span className="swiftly-card-title">Status Distribution</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
                <ResponsiveContainer width={180} height={180}>
                  <PieChart>
                    <Pie
                      data={Object.entries(reportData.statusBreakdown).map(([name, value]) => ({ name, value }))}
                      cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value"
                    >
                      {Object.keys(reportData.statusBreakdown).map((_, i) => (
                        <Cell key={i} fill={['#0073ea', '#00ca72', '#fdab3d', '#e2445c', '#579bfc', '#a25ddc', '#037f4c', '#ff5ac4'][i % 8]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {Object.entries(reportData.statusBreakdown).map(([name, count], i) => (
                    <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                      <div style={{
                        width: 10, height: 10, borderRadius: 2, flexShrink: 0,
                        background: ['#0073ea', '#00ca72', '#fdab3d', '#e2445c', '#579bfc', '#a25ddc', '#037f4c', '#ff5ac4'][i % 8],
                      }} />
                      <span style={{ color: 'var(--swiftly-text-secondary)' }}>{name}</span>
                      <span style={{ fontWeight: 600, marginLeft: 'auto' }}>{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Board Overview Cards */}
          {reportData.boards && reportData.boards.length > 0 && (
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: 'var(--swiftly-text)' }}>
                Board Overview
              </div>
              <div className="swiftly-grid swiftly-grid-3">
                {reportData.boards.map((board) => (
                  <BoardMiniCard
                    key={board.id}
                    board={board}
                    items={boardItems[String(board.id)] || []}
                    token={token}
                    onToast={showToast}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Activity Timeline */}
          {allItems.length > 0 && <ActivityTimeline allItems={allItems} />}
        </>
      )}

      {/* Empty state */}
      {!loading && !reportData && selectedBoardIds.length === 0 && (
        <div className="swiftly-empty">
          <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }}>
            <svg width="48" height="48" viewBox="0 0 28 28" fill="none">
              <rect width="28" height="28" rx="6" fill="#0073ea" />
              <path d="M8 18L13 8L18 14L22 10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="22" cy="10" r="2" fill="white" />
            </svg>
          </div>
          <h3>Select boards to activate the Command Center</h3>
          <p>Choose one or more boards above. The dashboard will auto-analyze your data and provide actionable insights.</p>
        </div>
      )}
    </div>
  );
}

export default DashboardView;
