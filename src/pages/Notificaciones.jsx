import React from 'react';

export default function Notificaciones({ notifications, onMarkAllRead }) {
  return (
    <div className="page active">
      <div className="page-header">
        <div className="page-title">
          Notificaciones
          <small>Alertas del sistema sobre stock, deudas e ingresos</small>
        </div>
        {notifications.some(n => !n.leida) && (
          <button className="btn btn-ghost btn-sm" onClick={onMarkAllRead}>
            Marcar todo leído
          </button>
        )}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {notifications.map(n => (
          <div 
            key={n.id} 
            style={{ 
              padding: '16px 20px', 
              borderBottom: '1px solid var(--border)', 
              display: 'flex', 
              gap: '14px', 
              alignItems: 'flex-start',
              background: n.leida ? 'transparent' : 'rgba(79, 142, 247, 0.04)'
            }}
          >
            <span style={{ fontSize: '22px' }}>{n.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: n.leida ? '400' : '600', marginBottom: '3px' }}>
                {n.titulo}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text3)' }}>{n.msg}</div>
              <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '4px' }}>{n.time}</div>
            </div>
            {!n.leida && (
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--accent)', flexShrink: 0, marginTop: '6px' }}></div>
            )}
          </div>
        ))}

        {notifications.length === 0 && (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text3)', fontSize: '14px' }}>
            No tenés notificaciones pendientes. ✨
          </div>
        )}
      </div>
    </div>
  );
}
