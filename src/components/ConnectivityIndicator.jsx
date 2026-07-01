import { useState, useEffect } from 'react';

export default function ConnectivityIndicator({ onOnline, onOffline }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      onOnline?.();
    };
    const handleOffline = () => {
      setIsOnline(false);
      onOffline?.();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [onOnline, onOffline]);

  if (isOnline) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
      background: 'var(--orange-bg)', color: 'var(--orange)',
      textAlign: 'center', padding: '8px 16px', fontSize: '12px', fontWeight: 600,
      borderBottom: '1px solid var(--orange)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
    }}>
      <span>📡</span>
      <span>Sin conexión. Los datos se sincronizarán cuando vuelvas a estar online.</span>
    </div>
  );
}
