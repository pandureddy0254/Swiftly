import React from 'react';

function ExportButtons({ onExportHtml, onExportText, onExportJson, loading }) {
  return (
    <div className="swiftly-card swiftly-export-bar">
      <span style={{ fontSize: 14, fontWeight: 600 }}>
        Report generated at {new Date().toLocaleTimeString()}
      </span>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onExportHtml} disabled={loading} className="swiftly-export-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M14 3v4a1 1 0 001 1h4"/><path d="M17 21H7a2 2 0 01-2-2V5a2 2 0 012-2h7l5 5v11a2 2 0 01-2 2z"/>
            <path d="M12 11v6"/><path d="M9 14l3 3 3-3"/>
          </svg>
          PDF
        </button>
        <button onClick={onExportText} disabled={loading} className="swiftly-export-btn">
          TXT
        </button>
        <button onClick={onExportJson} disabled={loading} className="swiftly-export-btn">
          JSON
        </button>
      </div>
    </div>
  );
}

export default ExportButtons;
