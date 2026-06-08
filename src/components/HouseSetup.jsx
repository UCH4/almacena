import React, { useState } from 'react';

export default function HouseSetup({ onCreateHouse, onJoinHouse, onLogout, user }) {
  const [activeTab, setActiveTab] = useState('create'); // 'create' or 'join'
  const [houseName, setHouseName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!houseName.trim()) return;
    setLoading(true);
    setError('');
    try {
      await onCreateHouse(houseName.trim());
    } catch (err) {
      setError(err.message || 'Error al crear la casa.');
      setLoading(false);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;
    setLoading(true);
    setError('');
    try {
      await onJoinHouse(inviteCode.trim());
    } catch (err) {
      setError(err.message || 'Error al unirse a la casa. Verificá el código.');
      setLoading(false);
    }
  };

  return (
    <div 
      style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '100dvh', 
        width: '100vw',
        background: 'var(--bg)',
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        padding: '20px'
      }}
    >
      <div 
        className="card" 
        style={{ 
          width: '100%', 
          maxWidth: '460px', 
          padding: '30px 24px', 
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--border2)'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div className="nav-logo" style={{ fontSize: '24px', justifyContent: 'center' }}>
            🏠 <span>Alacena</span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text3)', marginTop: '6px' }}>
            ¡Hola, {user.displayName}! Configuremos tu cuenta.
          </p>
        </div>

        {/* TABS DE SELECCION */}
        <div className="toggle-wrap mb-20" style={{ padding: '6px' }}>
          <button 
            className={`toggle-btn ${activeTab === 'create' ? 'active' : ''}`}
            onClick={() => { setActiveTab('create'); setError(''); }}
            style={{ padding: '10px' }}
          >
            Crear nueva casa
          </button>
          <button 
            className={`toggle-btn ${activeTab === 'join' ? 'active' : ''}`}
            onClick={() => { setActiveTab('join'); setError(''); }}
            style={{ padding: '10px' }}
          >
            Unirme a una casa
          </button>
        </div>

        {error && (
          <div 
            style={{ 
              background: 'var(--red-bg)', 
              color: 'var(--red)', 
              padding: '10px 14px', 
              borderRadius: 'var(--r-sm)', 
              fontSize: '12px',
              border: '1px solid rgba(247, 90, 90, 0.15)',
              marginBottom: '16px'
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {activeTab === 'create' ? (
          <form onSubmit={handleCreate}>
            <div className="form-group">
              <label className="form-label">Nombre de la Casa / Hogar</label>
              <input 
                className="form-input" 
                placeholder="Ej: Casa Tomas y Martina, Hogar Central" 
                value={houseName}
                onChange={(e) => setHouseName(e.target.value)}
                required
                disabled={loading}
              />
              <div className="form-hint" style={{ marginTop: '6px' }}>
                Esto creará un espacio de almacenamiento aislado para tu inventario y generará un código para invitar a otros.
              </div>
            </div>
            
            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', padding: '12px', marginTop: '10px' }}
              disabled={loading || !houseName.trim()}
            >
              {loading ? 'Creando casa...' : 'Crear Casa y Empezar'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleJoin}>
            <div className="form-group">
              <label className="form-label">Código de Invitación (6 caracteres)</label>
              <input 
                className="form-input" 
                placeholder="Ej: A8H2X9" 
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                maxLength={6}
                required
                disabled={loading}
                style={{ textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'center', fontSize: '18px', fontWeight: 'bold' }}
              />
              <div className="form-hint" style={{ marginTop: '6px' }}>
                Ingresá el código de 6 caracteres generado por el dueño de la casa para compartir stock y gastos con él.
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', padding: '12px', marginTop: '10px' }}
              disabled={loading || inviteCode.trim().length !== 6}
            >
              {loading ? 'Uniendo a la casa...' : 'Unirme a Casa'}
            </button>
          </form>
        )}

        <hr className="sep" />

        <div className="flex-between">
          <button 
            className="btn btn-ghost btn-sm" 
            onClick={onLogout}
            style={{ border: 'none', background: 'none', color: 'var(--text3)' }}
          >
            ← Salir de mi cuenta
          </button>
        </div>
      </div>
    </div>
  );
}
