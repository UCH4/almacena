import React, { useState } from 'react';

export default function Sidebar({ activePage, setActivePage, unreadNotifs, pendingPurchases, currentUser, userEmoji, inviteCode, onCopyInvite, house, onLeaveHouse, user, userHouses, onSwitchHouse, onJoinHouse, onLogout }) {
  const userCount = house?.members?.length || 2;
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showHouseSelector, setShowHouseSelector] = useState(false);
  const [showJoinInput, setShowJoinInput] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const handleNavClick = (page) => {
    setActivePage(page);
  };

  return (
    <nav className="sidebar" id="sidebar">
      <div className="nav-logo">🏠 <span>Alacena</span></div>
      <div className="nav-sub">Beta v1.0 · {userCount} usuario{userCount !== 1 ? 's' : ''}</div>

      <div className="nav-section">Principal</div>
      <button 
        className={`nav-item ${activePage === 'dashboard' ? 'active' : ''}`} 
        onClick={() => handleNavClick('dashboard')}
      >
        <span className="icon">📊</span>Dashboard
      </button>
      <button 
        className={`nav-item ${activePage === 'compras' ? 'active' : ''}`} 
        onClick={() => handleNavClick('compras')}
      >
        <span className="icon">🛒</span>Compras 
        {pendingPurchases > 0 && <span className="badge" id="badge-compras">{pendingPurchases}</span>}
      </button>
      <button 
        className={`nav-item ${activePage === 'stock' ? 'active' : ''}`} 
        onClick={() => handleNavClick('stock')}
      >
        <span className="icon">📦</span>Stock
      </button>
      <button 
        className={`nav-item ${activePage === 'gastos' ? 'active' : ''}`} 
        onClick={() => handleNavClick('gastos')}
      >
        <span className="icon">💸</span>Gastos & Deudas
      </button>

      <div className="nav-section">Extras</div>
      <button 
        className={`nav-item ${activePage === 'recetas' ? 'active' : ''}`} 
        onClick={() => handleNavClick('recetas')}
      >
        <span className="icon">🍽️</span>Recetas IA
      </button>
      <button 
        className={`nav-item ${activePage === 'notificaciones' ? 'active' : ''}`} 
        onClick={() => handleNavClick('notificaciones')}
      >
        <span className="icon">🔔</span>Notificaciones 
        {unreadNotifs > 0 && <span className="badge" id="badge-notif">{unreadNotifs}</span>}
      </button>
      <button 
        className={`nav-item ${activePage === 'actividad' ? 'active' : ''}`} 
        onClick={() => handleNavClick('actividad')}
      >
        <span className="icon">📋</span>Actividad
      </button>

      {inviteCode && (
        <div 
          className="nav-invite" 
          onClick={onCopyInvite}
          title="Copiar código de invitación"
          style={{
            margin: '8px 12px',
            padding: '8px 12px',
            background: 'var(--surface2)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            border: '1px dashed var(--border)',
            fontSize: '12px'
          }}
        >
          <span>🔑</span>
          <span style={{ fontFamily: 'monospace', fontWeight: 700, letterSpacing: '2px', color: 'var(--accent)' }}>
            {inviteCode}
          </span>
          <span style={{ marginLeft: 'auto', color: 'var(--text3)', fontSize: '10px' }}>copiar</span>
        </div>
      )}
      {onJoinHouse && (
        <div style={{ padding: '4px 12px' }}>
          {!showJoinInput ? (
            <button 
              className="btn btn-ghost btn-sm" 
              style={{ width: '100%', fontSize: '11px', color: 'var(--text3)' }}
              onClick={() => setShowJoinInput(true)}
            >
              🔑 Unirse a una casa
            </button>
          ) : (
            <div style={{ fontSize: '12px' }}>
              <div className="flex-between mb-4">
                <span style={{ color: 'var(--text3)', fontSize: '11px' }}>Ingresá el código</span>
                <button className="btn-close" style={{ fontSize: '14px' }} onClick={() => { setShowJoinInput(false); setJoinCode(''); }}>×</button>
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <input 
                  className="form-input" 
                  style={{ fontSize: '11px', padding: '4px 6px', textTransform: 'uppercase', letterSpacing: '2px', fontFamily: 'monospace' }}
                  maxLength={6}
                  placeholder="ABC123"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                />
                <button 
                  className="btn btn-sm btn-primary" 
                  style={{ fontSize: '11px', padding: '4px 8px' }}
                  disabled={joinCode.length !== 6 || joining}
                  onClick={async () => {
                    setJoining(true);
                    try {
                      await onJoinHouse(joinCode);
                      setShowJoinInput(false);
                      setJoinCode('');
                    } catch (e) {
                      // toast shown by App
                    }
                    setJoining(false);
                  }}
                >
                  {joining ? '...' : 'Ir'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      {userHouses && userHouses.length > 1 && (
        <div style={{ padding: '4px 12px' }}>
          {!showHouseSelector ? (
            <button 
              className="btn btn-ghost btn-sm" 
              style={{ width: '100%', fontSize: '11px', color: 'var(--text3)' }}
              onClick={() => setShowHouseSelector(true)}
            >
              🏠 Cambiar de casa
            </button>
          ) : (
            <div style={{ fontSize: '12px' }}>
              <div className="flex-between mb-4">
                <span style={{ color: 'var(--text3)', fontSize: '11px' }}>Mis casas</span>
                <button className="btn-close" style={{ fontSize: '14px' }} onClick={() => setShowHouseSelector(false)}>×</button>
              </div>
              {userHouses.map(h => (
                <button
                  key={h.id}
                  className={`btn btn-sm ${h.id === house?.id ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ width: '100%', fontSize: '11px', textAlign: 'left', marginBottom: '4px', justifyContent: 'flex-start' }}
                  onClick={() => { onSwitchHouse(h.id); setShowHouseSelector(false); }}
                >
                  {h.id === house?.id ? '📍 ' : ''}{h.name || h.id}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {onLeaveHouse && (
        <div style={{ padding: '8px 12px' }}>
          {showLeaveConfirm ? (
            <div style={{ fontSize: '12px', color: 'var(--text3)', textAlign: 'center' }}>
              <p style={{ marginBottom: '8px' }}>¿Salir de la casa?</p>
              <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                <button className="btn btn-sm" style={{ background: 'var(--red)', color: '#fff', fontSize: '11px' }} onClick={() => { onLeaveHouse(); setShowLeaveConfirm(false); }}>
                  Sí, salir
                </button>
                <button className="btn btn-sm btn-ghost" style={{ fontSize: '11px' }} onClick={() => setShowLeaveConfirm(false)}>
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button 
              className="btn btn-ghost btn-sm" 
              style={{ width: '100%', fontSize: '11px', color: 'var(--text3)' }}
              onClick={() => setShowLeaveConfirm(true)}
            >
              🚪 Salir de esta casa
            </button>
          )}
        </div>
      )}
      <div className="nav-user" style={{ marginTop: 'auto', gap: '8px' }}>
        <div className="avatar" style={{ fontSize: '24px', background: 'transparent' }}>
          {userEmoji || '🧑'}
        </div>
        <div className="info" style={{ flex: 1 }}>
          <div className="name">{user?.nickname || currentUser || 'Usuario'}</div>
          <div className="role">Miembro</div>
        </div>
        {onLogout && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={onLogout}
            title="Cerrar sesión"
            style={{ fontSize: '16px', padding: '4px 6px', lineHeight: 1 }}
          >
            🚪
          </button>
        )}
      </div>
    </nav>
  );
}
