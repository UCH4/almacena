import { useState, useEffect, useMemo } from 'react';
import { dbProvider } from '../db/dbProvider';

const FILTERS = [
  { key: 'all', label: 'Todo', icon: '📋' },
  { key: 'products', label: 'Stock', icon: '📦' },
  { key: 'purchases', label: 'Compras', icon: '🛒' },
  { key: 'notifications', label: 'Alertas', icon: '🔔' },
  { key: 'sheets', label: 'Sheets', icon: '📊' },
];

const ACTION_ICONS = {
  create: { products: '➕', purchases: '➕', notifications: '➕' },
  update: { products: '✏️', purchases: '✏️', notifications: '✏️' },
  delete: { products: '🗑️', purchases: '🗑️', notifications: '🗑️' },
};

const DEFAULT_ICONS = { create: '➕', update: '✏️', delete: '🗑️' };

function formatTime(timestamp) {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return 'Ahora mismo';
  if (mins < 60) return `Hace ${mins} min`;
  if (hrs < 24) return `Hace ${hrs}h`;
  if (days === 1) return 'Ayer';
  if (days < 7) return `Hace ${days} días`;
  return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
}

export default function Actividad({ house }) {
  const [auditLog, setAuditLog] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');

  useEffect(() => {
    if (!house?.id) return;
    const unsub = dbProvider.subscribeToAuditLog(house.id, (list) => {
      setAuditLog(list);
    });
    return unsub;
  }, [house?.id]);

  const filtered = useMemo(() => {
    if (activeFilter === 'all') return auditLog;
    if (activeFilter === 'sheets') {
      return auditLog.filter(e => e.entityType === 'purchases' && e.summary?.toLowerCase().includes('sheets'));
    }
    return auditLog.filter(e => e.entityType === activeFilter);
  }, [auditLog, activeFilter]);

  return (
    <div className="page">
      <div className="page-header">
        <h1>Actividad</h1>
        <p className="page-sub">Historial de cambios y movimientos en tu hogar</p>
      </div>

      <div className="filter-chips" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
        {FILTERS.map(f => (
          <button
            key={f.key}
            className={`chip ${activeFilter === f.key ? 'chip-active' : ''}`}
            onClick={() => setActiveFilter(f.key)}
          >
            {f.icon} {f.label}
          </button>
        ))}
      </div>

      <div className="timeline">
        {filtered.length === 0 && (
          <div className="empty-state">
            <span style={{ fontSize: '40px' }}>📭</span>
            <p>No hay actividad registrada aún.</p>
            <p className="text-muted">Las acciones se registrarán automáticamente aquí.</p>
          </div>
        )}
        {filtered.map((entry) => {
          const actionIcons = ACTION_ICONS[entry.action] || DEFAULT_ICONS;
          const icon = actionIcons?.[entry.entityType] || DEFAULT_ICONS[entry.action] || '📌';
          const entityLabels = {
            products: 'Producto', purchases: 'Compra', notifications: 'Alerta'
          };
          const entityLabel = entityLabels[entry.entityType] || entry.entityType;

          return (
            <div key={entry.id} className="timeline-item">
              <div className="timeline-icon">{icon}</div>
              <div className="timeline-content">
                <div className="timeline-header">
                  <span className="timeline-badge">{entityLabel}</span>
                  <span className="timeline-time">{formatTime(entry.timestamp)}</span>
                </div>
                <p className="timeline-summary">
                  <strong>{entry.userName || 'Sistema'}</strong>{' '}
                  {entry.summary || `${entry.action} ${entityLabel}`}
                </p>
                {entry.changedFields && entry.changedFields._action !== 'created' && entry.changedFields._action !== 'deleted' && Object.keys(entry.changedFields).length > 0 && (
                  <div className="timeline-diff">
                    {Object.entries(entry.changedFields).slice(0, 3).map(([field, change]) => (
                      <span key={field} className="diff-tag">
                        {field}: {typeof change?.from !== 'undefined' ? `${change.from} → ${change.to}` : change}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
