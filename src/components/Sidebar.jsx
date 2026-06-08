import React from 'react';

export default function Sidebar({ activePage, setActivePage, unreadNotifs, pendingPurchases, currentUser = 'Tomas' }) {
  const handleNavClick = (page) => {
    setActivePage(page);
  };

  return (
    <nav className="sidebar" id="sidebar">
      <div className="nav-logo">🏠 <span>Alacena</span></div>
      <div className="nav-sub">Beta v1.0 · 2 usuarios</div>

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

      <div className="nav-user" style={{ marginTop: 'auto' }}>
        <div className="avatar">{currentUser[0]}</div>
        <div className="info">
          <div className="name">{currentUser}</div>
          <div className="role">Administrador</div>
        </div>
      </div>
    </nav>
  );
}
