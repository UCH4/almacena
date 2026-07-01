import React, { useState } from 'react';
import AdBanner from '../components/AdBanner';

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const CURRENT_MONTH_INDEX = new Date().getMonth();

function getUserName(uid, membersInfo) {
  if (!membersInfo || !uid) return uid;
  const info = membersInfo[uid];
  const name = info?.name || info?.displayName || uid;
  const emoji = info?.emoji || '';
  return emoji + name;
}

export default function Dashboard({ 
  purchases, 
  products, 
  balances, 
  onOpenNewPurchase, 
  onViewPurchaseDetail, 
  activePage, 
  setActivePage,
  house,
  user
}) {
  const [chartMode, setChartMode] = useState('semana');

  const membersInfo = house?.membersInfo || {};
  const members = house?.members || [user?.uid || 'T'];
  const currentUserUid = user?.uid || members[0];
  const otherMembers = members.filter(m => m !== currentUserUid);
  const currentUserName = getUserName(currentUserUid, membersInfo);

  const lowStockProducts = products.filter(p => p.stock <= p.minStock);
  const recentPurchases = purchases.slice(0, 3);
  const currentMonthNum = (new Date().getMonth() + 1).toString().padStart(2, '0');

  const COLORS = ['var(--accent)', 'var(--accent2)', 'var(--green)', 'var(--orange)', 'var(--red)', 'var(--purple)'];

  const getChartDataMes = () => {
    const data = MONTHS.slice(0, CURRENT_MONTH_INDEX + 1).map(m => {
      const entry = { label: m };
      members.forEach(uid => { entry[uid] = 0; });
      return entry;
    });
    purchases.forEach(p => {
      if (p.isSettlement || p.estado !== 'confirmada') return;
      const parts = p.fecha.split('/');
      if (parts.length === 3) {
        const monthNum = parseInt(parts[1], 10) - 1;
        if (monthNum >= 0 && monthNum <= CURRENT_MONTH_INDEX && data[monthNum]?.[p.quien] !== undefined) {
          data[monthNum][p.quien] += p.total;
        }
      }
    });
    return data;
  };

  const getChartDataSemana = () => {
    const data = [
      { label: 'S1' }, { label: 'S2' }, { label: 'S3' }, { label: 'S4' },
    ];
    data.forEach(d => { members.forEach(uid => { d[uid] = 0; }); });

    purchases.forEach(p => {
      if (p.isSettlement || p.estado !== 'confirmada') return;
      const parts = p.fecha.split('/');
      if (parts.length === 3 && parts[1] === currentMonthNum) {
        const day = parseInt(parts[0], 10);
        let weekIdx = 3;
        if (day <= 7) weekIdx = 0;
        else if (day <= 14) weekIdx = 1;
        else if (day <= 21) weekIdx = 2;
        if (data[weekIdx][p.quien] !== undefined) data[weekIdx][p.quien] += p.total;
      }
    });
    return data;
  };

  const chartData = chartMode === 'semana' ? getChartDataSemana() : getChartDataMes();
  const allValues = chartData.flatMap(d => members.flatMap(uid => d[uid] || 0));
  const maxVal = Math.max(...allValues, 1);

  const getGastadoEsteMes = (uid) => {
    let total = 0;
    purchases.forEach(p => {
      if (p.isSettlement || p.estado !== 'confirmada') return;
      const parts = p.fecha.split('/');
      if (parts.length === 3 && parts[1] === currentMonthNum) {
        if (p.quien === uid) total += p.total;
      }
    });
    return total;
  };

  const getBalanceText = () => {
    if (balances.net.amount === 0) return 'Cuentas saldadas';
    return `${getUserName(balances.net.fromUser, membersInfo)} debe a ${getUserName(balances.net.toUser, membersInfo)}`;
  };

  return (
    <div className="page active">
      <div className="page-header">
        <div className="page-title">
          ¡Hola, {currentUserName}! 👋
          <small>Resumen de la alacena · {MONTHS[CURRENT_MONTH_INDEX]} {new Date().getFullYear()}</small>
        </div>
        <button className="btn btn-primary" onClick={onOpenNewPurchase}>+ Nueva compra</button>
      </div>

      {/* METRIC CARDS */}
      <div className="grid-4 mb-20">
        <div className="stat-card blue">
          <div className="stat-icon">💳</div>
          <div className="stat-label">Gasté este mes</div>
          <div className="stat-value">${getGastadoEsteMes(currentUserUid).toLocaleString('es-AR')}</div>
        </div>
        {otherMembers.slice(0, 2).map(uid => (
          <div key={uid} className="stat-card purple">
            <div className="stat-icon">👤</div>
            <div className="stat-label">Gastó {getUserName(uid, membersInfo)}</div>
            <div className="stat-value">${getGastadoEsteMes(uid).toLocaleString('es-AR')}</div>
          </div>
        ))}
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
          <div className="stat-sub">{getBalanceText()}</div>
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
                  {members.map((uid, mi) => (
                    <div
                      key={uid}
                      className="bar-col"
                      style={{
                        height: `${((d[uid] || 0) / maxVal) * 120}px`,
                        background: COLORS[mi % COLORS.length],
                        borderRadius: '4px 4px 0 0',
                        flex: 1,
                        transition: 'height 0.3s'
                      }}
                      title={`${getUserName(uid, membersInfo)}: $${(d[uid] || 0).toLocaleString()}`}
                    ></div>
                  ))}
                </div>
                <div className="bar-label">{d.label}</div>
              </div>
            ))}
          </div>
          <div className="bar-legend">
            {members.map((uid, mi) => (
              <div key={uid} className="bar-legend-item">
                <div className="bar-dot" style={{ backgroundColor: COLORS[mi % COLORS.length] }}></div>
                {getUserName(uid, membersInfo)}
              </div>
            ))}
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
                    {c.fecha} · {getUserName(c.quien, membersInfo)}
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

      <AdBanner />

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
          <div style={{ display: 'grid', gap: '8px' }}>
            {(balances.members || []).slice(0, 4).map((m, mi) => {
              const netAmount = m.net || 0;
              return (
                <div key={m.uid} className="flex-between" style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                  <div className="flex" style={{ gap: '8px', alignItems: 'center' }}>
                    <div className="debt-avatar" style={{ width: '28px', height: '28px', fontSize: '12px', background: COLORS[mi % COLORS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', color: '#fff', fontWeight: 700 }}>
                      {(getUserName(m.uid, membersInfo) || '?').charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontSize: '13px' }}>{getUserName(m.uid, membersInfo)}</span>
                  </div>
                  <span style={{ fontWeight: 600, fontSize: '13px', color: netAmount === 0 ? 'var(--text2)' : netAmount > 0 ? 'var(--green)' : 'var(--red)' }}>
                    {netAmount > 0 ? '+' : ''}${Math.abs(Math.round(netAmount)).toLocaleString('es-AR')}
                  </span>
                </div>
              );
            })}
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
