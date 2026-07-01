export default function LoadingSkeleton({ type = 'card', count = 3 }) {
  if (type === 'table') {
    return (
      <div className="card" style={{ padding: '20px' }}>
        <div className="skeleton" style={{ height: '20px', width: '200px', marginBottom: '16px', borderRadius: '6px' }}></div>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} style={{ display: 'flex', gap: '12px', marginBottom: '12px', alignItems: 'center' }}>
            <div className="skeleton" style={{ height: '14px', flex: 2, borderRadius: '4px' }}></div>
            <div className="skeleton" style={{ height: '14px', flex: 1, borderRadius: '4px' }}></div>
            <div className="skeleton" style={{ height: '14px', flex: 1, borderRadius: '4px' }}></div>
            <div className="skeleton" style={{ height: '14px', width: '60px', borderRadius: '4px' }}></div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'stat') {
    return (
      <div className="grid-4 mb-20">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="stat-card" style={{ padding: '20px' }}>
            <div className="skeleton" style={{ width: '40px', height: '40px', borderRadius: '10px', marginBottom: '12px' }}></div>
            <div className="skeleton" style={{ width: '120px', height: '12px', borderRadius: '4px', marginBottom: '8px' }}></div>
            <div className="skeleton" style={{ width: '80px', height: '24px', borderRadius: '6px' }}></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: '20px' }}>
      <div className="skeleton" style={{ height: '20px', width: '160px', marginBottom: '16px', borderRadius: '6px' }}></div>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton" style={{ height: '12px', width: `${80 - i * 10}%`, marginBottom: '10px', borderRadius: '4px' }}></div>
      ))}
    </div>
  );
}
