import { useRegisterSW } from 'virtual:pwa-register/react';

export default function UpdateBanner() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW registrado:', r);
    },
    onRegisterError(error) {
      console.log('SW error:', error);
    },
  });

  if (!needRefresh) return null;

  return (
    <div
      className="update-banner"
      style={{
        position: 'fixed',
        bottom: '80px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        background: 'var(--surface1)',
        border: '1px solid var(--accent)',
        borderRadius: '12px',
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <span>🔄 Nueva versión disponible</span>
      <button
        className="btn btn-primary btn-sm"
        onClick={() => updateServiceWorker(true)}
      >
        Actualizar
      </button>
      <button
        className="btn btn-ghost btn-sm"
        onClick={() => setNeedRefresh(false)}
      >
        ×
      </button>
    </div>
  );
}
