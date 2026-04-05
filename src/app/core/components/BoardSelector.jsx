import React from 'react';
import { useSwiftly } from '@core/state/useSwiftly';

function BoardSelector({ label, showCount = true, subtitle, filterFn, style }) {
  const { boards, selectedBoardIds, toggleBoard } = useSwiftly();

  const displayBoards = filterFn ? boards.filter(filterFn) : boards;

  return (
    <div className="swiftly-board-selector" style={style}>
      {(label || showCount) && (
        <div className="swiftly-board-selector-header">
          {label && <span className="swiftly-board-selector-label">{label}</span>}
          {subtitle && <span className="swiftly-board-selector-subtitle">{subtitle}</span>}
          {showCount && (
            <span className="swiftly-board-selector-count">
              {selectedBoardIds.length} selected
            </span>
          )}
        </div>
      )}
      <div className="swiftly-board-selector-chips">
        {displayBoards.map((board) => (
          <button
            key={board.id}
            onClick={() => toggleBoard(String(board.id))}
            className={`swiftly-board-chip ${selectedBoardIds.includes(String(board.id)) ? 'swiftly-board-chip--selected' : ''}`}
          >
            {board.name}
          </button>
        ))}
        {displayBoards.length === 0 && (
          <span style={{ fontSize: 13, color: 'var(--swiftly-text-secondary)' }}>No boards available</span>
        )}
      </div>
    </div>
  );
}

export default BoardSelector;
