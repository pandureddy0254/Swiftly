import React from 'react';

// Constants
const COLUMN_COLORS = {
  backlog: '#c4c4c4',
  todo: '#579bfc',
  inProgress: '#0073ea',
  done: '#00ca72',
  stuck: '#e2445c',
};

const SPRINT_COLUMNS = [
  { key: 'backlog', label: 'Backlog', icon: '\u{1F4CB}' },
  { key: 'todo', label: 'To Do', icon: '\u{1F4DD}' },
  { key: 'inProgress', label: 'In Progress', icon: '\u{1F504}' },
  { key: 'done', label: 'Done', icon: '\u2705' },
];

/** Extract assignee name from item. */
function getAssignee(item) {
  const personCol = item.column_values?.find(
    (c) => c.type === 'people' || c.type === 'person',
  );
  if (personCol?.text) return personCol.text;
  return null;
}

/** Extract status text from item column_values. */
function getStatusText(item) {
  const statusCol = item.column_values?.find((c) => c.type === 'status');
  return statusCol?.text || '';
}

/** Format a size label for display. */
function getEstimateLabel(item) {
  const estCol = item.column_values?.find(
    (c) => c.type === 'numbers' || c.title?.toLowerCase().includes('point') || c.title?.toLowerCase().includes('estimate'),
  );
  if (estCol?.text && !isNaN(Number(estCol.text))) {
    const pts = Number(estCol.text);
    if (pts > 0) return `${pts} pts`;
  }
  const sizeCol = item.column_values?.find(
    (c) => c.title?.toLowerCase().includes('size') || c.title?.toLowerCase().includes('effort'),
  );
  if (sizeCol?.text) return `Est: ${sizeCol.text}`;
  return null;
}

// Item Card (Kanban)
function ItemCard({ item, isStuck }) {
  const assignee = getAssignee(item);
  const estimate = getEstimateLabel(item);
  const statusText = getStatusText(item);
  const cardStyle = {
    background: 'white', borderRadius: 'var(--swiftly-radius)', padding: '12px 14px', marginBottom: 8,
    border: `1px solid ${isStuck ? COLUMN_COLORS.stuck : 'var(--swiftly-border)'}`,
    borderLeft: isStuck ? `4px solid ${COLUMN_COLORS.stuck}` : undefined,
    transition: 'box-shadow 0.2s, transform 0.2s', cursor: 'default',
  };
  return (
    <div style={cardStyle}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = 'var(--swiftly-shadow-md)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}
    >
      <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--swiftly-text)', marginBottom: 6, lineHeight: 1.4 }}>
        {item.name}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        {isStuck && (
          <span style={{ fontSize: 10, fontWeight: 700, color: 'white', background: COLUMN_COLORS.stuck, padding: '1px 6px', borderRadius: 4, textTransform: 'uppercase' }}>
            {statusText}
          </span>
        )}
        {estimate && (
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--swiftly-text-secondary)', background: 'var(--swiftly-bg)', padding: '2px 8px', borderRadius: 4 }}>
            {estimate}
          </span>
        )}
        {assignee && (
          <span style={{ fontSize: 11, color: 'var(--swiftly-primary)', fontWeight: 500, marginLeft: 'auto', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {assignee}
          </span>
        )}
      </div>
    </div>
  );
}

// Kanban Column
function KanbanColumn({ column, items, stuckItems }) {
  const allItems = column.key === 'inProgress' ? [...items, ...stuckItems] : items;
  const color = COLUMN_COLORS[column.key];

  return (
    <div style={{ flex: 1, minWidth: 220, display: 'flex', flexDirection: 'column' }}>
      {/* Column header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
        background: `${color}12`, borderRadius: '8px 8px 0 0', borderBottom: `3px solid ${color}`,
      }}>
        <span style={{ fontSize: 16 }}>{column.icon}</span>
        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--swiftly-text)' }}>
          {column.label}
        </span>
        <span style={{
          marginLeft: 'auto', fontSize: 12, fontWeight: 600, color,
          background: `${color}20`, padding: '2px 8px', borderRadius: 10,
        }}>
          {allItems.length}
        </span>
      </div>

      {/* Column body */}
      <div style={{
        flex: 1, padding: 8, background: 'var(--swiftly-bg)', borderRadius: '0 0 8px 8px',
        minHeight: 120, maxHeight: 480, overflowY: 'auto',
      }}>
        {allItems.length === 0 && (
          <div style={{
            textAlign: 'center', padding: '24px 12px', color: 'var(--swiftly-text-secondary)',
            fontSize: 13, fontStyle: 'italic',
          }}>
            No items
          </div>
        )}
        {allItems.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            isStuck={stuckItems.includes(item)}
          />
        ))}
      </div>
    </div>
  );
}

// KanbanBoard
function KanbanBoard({ columns, onItemClick }) {
  const stuckItems = columns.stuck || [];

  return (
    <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4 }}>
      {SPRINT_COLUMNS.map((col) => (
        <KanbanColumn
          key={col.key}
          column={col}
          items={columns[col.key] || []}
          stuckItems={col.key === 'inProgress' ? stuckItems : []}
        />
      ))}
    </div>
  );
}

export default KanbanBoard;
