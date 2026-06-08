import React, { useState } from 'react';

export default function Dashboard({ 
  purchases, 
  products, 
  balances, 
  onOpenNewPurchase, 
  onViewPurchaseDetail, 
  activePage, 
  setActivePage 
}) {
  const [chartMode, setChartMode] = useState('semana'); // 'semana' or 'mes'

  // Filtrar productos con stock bajo
  const lowStockProducts = products.filter(p => p.stock <= p.minStock);

  // Filtrar últimas 3 compras
  const recentPurchases = purchases.slice(0, 3);

  // Agrupamiento dinámico de datos para el gráfico
  // Agrupar compras por mes
  const getChartDataMes = () => {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'];
    const data = months.map(m => ({ label: m, T: 0, S: 0 }));
    
    // Sumar semillas históricas fijas para simular historial anterior
    // Febrero
    data[1].T += 32000; data[1].S += 28000;
    // Marzo
    data[2].T += 38500; data[2].S += 35000;
    // Abril
    data[3].T += 41200; data[3].S += 37600;
    // Mayo
    data[4].T += 42000; data[4].S += 40700;

    // Procesar compras reales en la base de datos
    purchases.forEach(p => {
      if (p.isSettlement || p.estado !== 'confirmada') return;
      // Parsear fecha DD/MM/YYYY
      const parts = p.fecha.split('/');
      if (parts.length === 3) {
        const monthNum = parseInt(parts[1], 10) - 1; // 0-indexed
        if (monthNum >= 0 && monthNum <= 5) {
          if (p.quien === 'T') data[monthNum].T += p.total;
          if (p.quien === 'S') data[monthNum].S += p.total;
        }
      }
    });

    return data;
  };

  // Agrupar compras por semanas en Junio 2026 (mes actual en el mockup)
  const getChartDataSemana = () => {
    const data = [
      { label: 'S1', T: 8200, S: 6400 },
      { label: 'S2', T: 12300, S: 9800 },
      { label: 'S3', T: 16200, S: 14480 },
      { label: 'S4', T: 10500, S: 7970 },
    ];

    // Procesar compras de Junio reales agregándolas a la semana respectiva
    purchases.forEach(p => {
      if (p.isSettlement || p.estado !== 'confirmada') return;
      const parts = p.fecha.split('/');
      if (parts.length === 3 && parts[1] === '06') { // Solo Junio
        const day = parseInt(parts[0], 10);
        let weekIdx = 3; // Por defecto S4
        if (day <= 7) weekIdx = 0;
        else if (day <= 14) weekIdx = 1;
        else if (day <= 21) weekIdx = 2;

        if (p.quien === 'T') data[weekIdx].T += p.total;
        if (p.quien === 'S') data[weekIdx].S += p.total;
      }
    });

    return data;
  };

  const chartData = chartMode === 'semana' ? getChartDataSemana() : getChartDataMes();
  const maxVal = Math.max(...chartData.map(d => Math.max(d.T, d.S)), 1);

  // Gastos totales de este mes (Junio)
  const getGastadoEsteMes = (user) => {
    let total = 0;
    purchases.forEach(p => {
      if (p.isSettlement || p.estado !== 'confirmada') return;
      const parts = p.fecha.split('/');
      if (parts.length === 3 && parts[1] === '06') { // Junio
        if (p.quien === user) total += p.total;
      }
    });
    return total;
  };

  const gastadoTomas = getGastadoEsteMes('T');
  const gastadoHermana = getGastadoEsteMes('S');

  return (
    <div className="page active">
      <div className="page-header">
        <div className="page-title">
          ¡Hola, Tomas! 👋
          <small>Resumen de la alacena · Junio 2026</small>
        </div>
        <button className="btn btn-primary" onClick={onOpenNewPurchase}>+ Nueva compra</button>
      </div>

      {/* METRIC CARDS */}
      <div className="grid-4 mb-20">
        <div className="stat-card blue">
          <div className="stat-icon">💳</div>
          <div className="stat-label">Gasté este mes (Jun)</div>
          <div className="stat-value">${gastadoTomas.toLocaleString('es-AR')}</div>
          <div className="stat-sub">+12% vs mayo</div>
        </div>
        <div className="stat-card purple">
          <div className="stat-icon">👩</div>
          <div className="stat-label">Gastó mi hermana (Jun)</div>
          <div className="stat-value">${gastadoHermana.toLocaleString('es-AR')}</div>
          <div className="stat-sub">-5% vs mayo</div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon">📦</div>
          <div className="stat-label">Productos en stock</div>
          <div className="stat-value">{products.filter(p => p.stock > 0).length}</div>
          <div className="stat-sub">{lowStockProducts.length} con stock bajo</div>
        </div>
        <div className="stat-card orange">
          <div className="stat-icon">⚖️</div>
          <div className="stat-label">Balance neto</div>
          <div className="stat-value">{balances.net.formattedAmount}</div>
          <div className="stat-sub">
            {balances.net.amount === 0 
              ? 'Cuentas saldadas' 
              : balances.net.fromUser === 'S' 
                ? 'Te deben a vos' 
                : 'Debés a tu hermana'}
          </div>
        </div>
      </div>

      <div className="grid-2">
        {/* GRÁFICO */}
        <div className="card">
          <div className="flex-between mb-12">
            <div className="card-title">Gastos por {chartMode}</div>
            <div className="toggle-wrap">
              <button 
                className={`toggle-btn ${chartMode === 'semana' ? 'active' : ''}`} 
                onClick={() => setChartMode('semana')}
              >
                Semana
              </button>
              <button 
                className={`toggle-btn ${chartMode === 'mes' ? 'active' : ''}`} 
                onClick={() => setChartMode('mes')}
              >
                Mes
              </button>
            </div>
          </div>
          <div className="bar-chart" id="bar-chart">
            {chartData.map((d, idx) => (
              <div className="bar-group" key={idx}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', flex: 1, width: '100%' }}>
                  <div 
                    className="bar-col tomas" 
                    style={{ height: `${(d.T / maxVal) * 120}px` }} 
                    title={`Tomas: $${d.T.toLocaleString()}`}
                  ></div>
                  <div 
                    className="bar-col hermana" 
                    style={{ height: `${(d.S / maxVal) * 120}px` }} 
                    title={`Hermana: $${d.S.toLocaleString()}`}
                  ></div>
                </div>
                <div className="bar-label">{d.label}</div>
              </div>
            ))}
          </div>
          <div className="bar-legend">
            <div className="bar-legend-item">
              <div className="bar-dot" style={{ backgroundColor: 'var(--accent)' }}></div>
              Tomas
            </div>
            <div className="bar-legend-item">
              <div className="bar-dot" style={{ backgroundColor: 'var(--accent2)' }}></div>
              Hermana
            </div>
          </div>
        </div>

        {/* ÚLTIMAS COMPRAS */}
        <div className="card">
          <div className="flex-between mb-12">
            <div className="card-title">Últimas cargas</div>
            <button className="btn btn-ghost btn-sm" onClick={() => setActivePage('compras')}>Ver todas</button>
          </div>
          <div id="recent-purchases">
            {recentPurchases.map(c => (
              <div 
                className="flex-between" 
                style={{ padding: '10px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }} 
                onClick={() => onViewPurchaseDetail(c)}
                key={c.id}
              >
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '500' }}>
                    {c.comercio} {c.isSettlement && <span className="badge badge-green">Liquidación</span>}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text3)' }}>
                    {c.fecha} · {c.quien === 'T' ? 'Tomas' : 'Hermana'}
                  </div>
                </div>
                <div className="text-right">
                  <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text)' }}>
                    ${c.total.toLocaleString('es-AR')}
                  </div>
                  <span className={`badge ${c.estado === 'confirmada' ? 'badge-green' : 'badge-orange'}`}>
                    {c.estado}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-16 grid-2">
        {/* STOCK BAJO */}
        <div className="card">
          <div className="card-title mb-12">⚠️ Alerta de Stock Bajo</div>
          <div id="low-stock-list">
            {lowStockProducts.length === 0 ? (
              <div style={{ color: 'var(--text3)', fontSize: '13px', padding: '10px 0' }}>
                ¡Todos los productos tienen stock suficiente! 🥳
              </div>
            ) : (
              lowStockProducts.slice(0, 4).map(p => {
                const pct = Math.min(100, Math.round((p.stock / Math.max(p.minStock, 1)) * 100));
                const color = pct < 50 ? 'red' : 'orange';
                return (
                  <div style={{ marginBottom: '14px' }} key={p.id}>
                    <div className="flex-between mb-8">
                      <span style={{ fontSize: '13px', fontWeight: '500' }}>{p.nombre}</span>
                      <span style={{ fontSize: '12px', color: 'var(--text3)' }}>
                        {p.stock} {p.unit} (Mín: {p.minStock})
                      </span>
                    </div>
                    <div className="progress-wrap">
                      <div className={`progress-bar ${color}`} style={{ width: `${pct}%` }}></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* BALANCE RAPIDO */}
        <div className="card">
          <div className="card-title mb-12">Balance actual</div>
          <div className="debt-card" style={{ border: 'none', padding: 0 }}>
            <div className="debt-avatars">
              <div className="debt-avatar" style={{ background: 'linear-gradient(135deg, var(--accent), #3a7de0)' }}>T</div>
              <div className="debt-avatar" style={{ background: 'linear-gradient(135deg, var(--accent2), #6a4de0)' }}>S</div>
            </div>
            <div className="debt-info">
              <div className="debt-text">
                {balances.net.amount === 0 
                  ? 'Están al día' 
                  : balances.net.fromUser === 'S' 
                    ? 'Tu hermana te debe' 
                    : 'Le debés a tu hermana'}
              </div>
              <div className="debt-sub">
                Cálculo en tiempo real por consumo individual y compartido.
              </div>
            </div>
            <div 
              className="debt-amount" 
              style={{ color: balances.net.amount === 0 ? 'var(--text2)' : balances.net.fromUser === 'S' ? 'var(--green)' : 'var(--red)' }}
            >
              {balances.net.formattedAmount}
            </div>
          </div>
          <hr className="sep" />
          <div className="flex-between">
            <span style={{ fontSize: '13px', color: 'var(--text3)' }}>
              Saldar deudas resetea el balance neto.
            </span>
            <button className="btn btn-primary btn-sm" onClick={() => setActivePage('gastos')}>Ver detalles</button>
          </div>
        </div>
      </div>
    </div>
  );
}
