import React from 'react';

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

export default DashboardSkeleton;
