import React, { useState, useEffect } from 'react';
import { requestPermission, subscribeUser, unsubscribeUser, saveSubscriptionToFirestore, sendTestPush } from '../services/pushNotifications';
import { dbProvider } from '../db/dbProvider';

export default function Notificaciones({ notifications, onMarkAllRead, house, user }) {
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushStatus, setPushStatus] = useState('');

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'granted') {
      setPushEnabled(true);
    }
  }, []);

  const handleTogglePush = async () => {
    if (pushEnabled) {
      await unsubscribeUser();
      setPushEnabled(false);
      setPushStatus('Notificaciones push desactivadas');
    } else {
      const permission = await requestPermission();
      if (permission === 'granted') {
        const sub = await subscribeUser();
        if (sub) {
          setPushEnabled(true);
          setPushStatus('✅ Notificaciones push activadas');
          await saveSubscriptionToFirestore(sub, dbProvider, house?.id, user?.uid);
          await sendTestPush(sub);
        }
      } else {
        setPushStatus('❌ Permiso denegado. Activá las notificaciones desde la configuración del navegador.');
      }
    }
    setTimeout(() => setPushStatus(''), 4000);
  };

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

      {/* CONFIGURACIÓN PUSH */}
      <div className="card mb-16" style={{ padding: '16px' }}>
        <div className="flex-between">
          <div>
            <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>
              📡 Notificaciones push
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text2)' }}>
              Recibí alertas incluso cuando la app está cerrada
            </div>
          </div>
          <button
            className={`btn btn-sm ${pushEnabled ? 'btn-secondary' : 'btn-primary'}`}
            onClick={handleTogglePush}
          >
            {pushEnabled ? '🔕 Desactivar' : '🔔 Activar'}
          </button>
        </div>
        {pushStatus && (
          <div style={{ fontSize: '12px', marginTop: '8px', color: pushStatus.includes('✅') ? 'var(--green)' : pushStatus.includes('❌') ? 'var(--red)' : 'var(--text2)' }}>
            {pushStatus}
          </div>
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
