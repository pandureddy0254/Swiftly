import React from 'react';

function ActivityTimeline({ items, boardItems }) {
  // Support both the flat allItems list and the boardItems map
  const allItems = items || (boardItems ? Object.values(boardItems).flat() : []);

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

export default ActivityTimeline;
