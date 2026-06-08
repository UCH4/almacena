import React from 'react';

export default function Login({ onLogin, error }) {
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
          maxWidth: '400px', 
          textAlign: 'center', 
          padding: '40px 30px', 
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--border2)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '24px'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div className="nav-logo" style={{ fontSize: '32px', justifyContent: 'center' }}>
            🏠 <span>Alacena</span>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text3)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Gestión de Hogar e Inventario
          </div>
        </div>

        <p style={{ fontSize: '14px', color: 'var(--text2)', lineHeight: '1.6' }}>
          Accedé de forma segura para gestionar el stock de tu alacena, registrar compras y dividir gastos con tu grupo familiar en tiempo real.
        </p>

        {error && (
          <div 
            style={{ 
              background: 'var(--red-bg)', 
              color: 'var(--red)', 
              padding: '10px 14px', 
              borderRadius: 'var(--r-sm)', 
              fontSize: '12px',
              border: '1px solid rgba(247, 90, 90, 0.15)',
              width: '100%'
            }}
          >
            ⚠️ {error}
          </div>
        )}

        <button 
          className="btn btn-primary" 
          onClick={onLogin}
          style={{ 
            width: '100%', 
            padding: '14px 20px', 
            fontSize: '15px', 
            fontWeight: '600',
            gap: '12px',
            borderRadius: 'var(--r-sm)'
          }}
        >
          {/* Logo SVG simple de Google */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
          </svg>
          Ingresar con Google
        </button>

        <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '10px' }}>
          Tus datos se encriptan y aíslan de forma segura usando Firebase Security Rules.
        </div>
      </div>
    </div>
  );
}
