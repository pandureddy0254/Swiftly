import React, { useState } from 'react';

const STALE_DAYS = 7;

function daysSince(dateStr) {
  if (!dateStr) return Infinity;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
}

function progressClass(pct) {
  if (pct >= 75) return 'swiftly-progress-fill--success';
  if (pct >= 40) return 'swiftly-progress-fill--warning';
  return 'swiftly-progress-fill--danger';
}

function resolveBoardName(board) {
  return board?.name || board?.boardName || board?.board_name || `Board ${board?.id || '?'}`;
}

// ---------------------------------------------------------------------------
// Board Mini-Card
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
// BoardOverviewCards (container)
// ---------------------------------------------------------------------------
function BoardOverviewCards({ boards, onRefresh, boardItems, token, showToast }) {
  if (!boards || boards.length === 0) return null;

  return (
    <div>
      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: 'var(--swiftly-text)' }}>
        Board Overview
      </div>
      <div className="swiftly-grid swiftly-grid-3">
        {boards.map((board) => (
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
  );
}

export default BoardOverviewCards;
