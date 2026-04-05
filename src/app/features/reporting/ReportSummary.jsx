import React from 'react';

function ReportSummary({ reportData }) {
  return (
    <div className="swiftly-grid swiftly-grid-4">
      <div className="swiftly-card swiftly-stat">
        <div className="swiftly-stat-value">{reportData.totalBoards}</div>
        <div className="swiftly-stat-label">Boards</div>
      </div>
      <div className="swiftly-card swiftly-stat">
        <div className="swiftly-stat-value">{reportData.totalItems}</div>
        <div className="swiftly-stat-label">Total Items</div>
      </div>
      <div className="swiftly-card swiftly-stat">
        <div className="swiftly-stat-value">{reportData.totalSubitems}</div>
        <div className="swiftly-stat-label">Subitems</div>
      </div>
      <div className="swiftly-card swiftly-stat">
        <div className="swiftly-stat-value" style={{
          color: reportData.overallProgress >= 75 ? 'var(--swiftly-success)'
            : reportData.overallProgress >= 40 ? 'var(--swiftly-warning)'
            : 'var(--swiftly-danger)'
        }}>
          {reportData.overallProgress}%
        </div>
        <div className="swiftly-stat-label">Overall Progress</div>
      </div>
    </div>
  );
}

export default ReportSummary;
