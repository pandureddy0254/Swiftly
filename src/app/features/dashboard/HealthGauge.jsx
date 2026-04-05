import React, { useState } from 'react';

function scoreColor(score) {
  if (score >= 75) return 'var(--swiftly-success)';
  if (score >= 50) return 'var(--swiftly-warning)';
  return 'var(--swiftly-danger)';
}

function HealthGauge({ score, breakdown, style }) {
  const [showTip, setShowTip] = useState(false);
  const radius = 70;
  const stroke = 10;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = scoreColor(score);

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', ...style }}
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

export { scoreColor };
export default HealthGauge;
