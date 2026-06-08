import React from 'react';

export default function MobileTabs({ activePage, setActivePage, pendingPurchases }) {
  return (
    <div className="mobile-bar">
      <button 
        className={`mobile-tab ${activePage === 'dashboard' ? 'active' : ''}`} 
        onClick={() => setActivePage('dashboard')}
      >
        <span className="m-icon">📊</span>Inicio
      </button>
      <button 
        className={`mobile-tab ${activePage === 'compras' ? 'active' : ''}`} 
        onClick={() => setActivePage('compras')}
      >
        <span className="m-icon">🛒</span>Compras
        {pendingPurchases > 0 && <span className="m-badge">{pendingPurchases}</span>}
      </button>
      <button 
        className={`mobile-tab ${activePage === 'stock' ? 'active' : ''}`} 
        onClick={() => setActivePage('stock')}
      >
        <span className="m-icon">📦</span>Stock
      </button>
      <button 
        className={`mobile-tab ${activePage === 'gastos' ? 'active' : ''}`} 
        onClick={() => setActivePage('gastos')}
      >
        <span className="m-icon">💸</span>Gastos
      </button>
      <button 
        className={`mobile-tab ${activePage === 'recetas' ? 'active' : ''}`} 
        onClick={() => setActivePage('recetas')}
      >
        <span className="m-icon">🍽️</span>Recetas
      </button>
    </div>
  );
}
