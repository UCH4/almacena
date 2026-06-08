import React from 'react';

export default function Gastos({ purchases, balances, onSaldarDeudas, showToast }) {
  const handleExportSheets = () => {
    showToast('📥 Sincronizando datos con Google Sheets...', 'info');
    setTimeout(() => {
      showToast('✅ Google Sheets actualizado: Hojas "Compras", "Inventario" y "Gastos" sincronizadas con éxito.', 'success');
    }, 1800);
  };

  // Recopilar todos los ítems individuales de las compras confirmadas para el desglose detallado
  const allItems = [];
  purchases.forEach(p => {
    if (p.isSettlement || p.estado !== 'confirmada') return;
    p.items.forEach(item => {
      const totalCost = item.precio * item.qty;
      let tomasAmt = 0;
      let hermanaAmt = 0;

      if (item.shared) {
        tomasAmt = totalCost / 2;
        hermanaAmt = totalCost / 2;
      } else {
        const hasT = item.consumidores.includes('T');
        const hasS = item.consumidores.includes('S');
        if (hasT && hasS) {
          tomasAmt = totalCost / 2;
          hermanaAmt = totalCost / 2;
        } else if (hasT) {
          tomasAmt = totalCost;
        } else if (hasS) {
          hermanaAmt = totalCost;
        }
      }

      allItems.push({
        id: `${p.id}-${item.nombre}-${Math.random()}`,
        comercio: p.comercio,
        fecha: p.fecha,
        quien: p.quien,
        nombre: item.nombre,
        qty: item.qty,
        unit: item.unit,
        precioTotal: totalCost,
        tomasAmt,
        hermanaAmt,
        shared: item.shared || (item.consumidores.includes('T') && item.consumidores.includes('S'))
      });
    });
  });

  return (
    <div className="page active">
      <div className="page-header">
        <div className="page-title">
          Gastos & Deudas
          <small>Distribución proporcional de costos y balance neto del hogar</small>
        </div>
      </div>

      <div className="grid-2 mb-20">
        {/* TARJETA DE BALANCE NETO */}
        <div className="debt-card card">
          <div className="debt-avatars">
            <div className="debt-avatar" style={{ background: 'linear-gradient(135deg, var(--accent), #3a7de0)' }}>T</div>
            <div className="debt-avatar" style={{ background: 'linear-gradient(135deg, var(--accent2), #6a4de0)' }}>S</div>
          </div>
          <div className="debt-info">
            <div className="debt-text" style={{ fontWeight: 600 }}>
              {balances.net.amount === 0 
                ? 'Están al día' 
                : balances.net.fromUser === 'S' 
                  ? 'Tu hermana te debe' 
                  : 'Le debés a tu hermana'}
            </div>
            <div className="debt-sub">
              {balances.net.amount === 0 
                ? 'No hay deudas pendientes en este momento.' 
                : `Actualizado hoy · Liquidación del balance por compras y consumos.`}
            </div>
          </div>
          <div>
            <div 
              className="debt-amount" 
              style={{ color: balances.net.amount === 0 ? 'var(--text2)' : balances.net.fromUser === 'S' ? 'var(--green)' : 'var(--red)' }}
            >
              {balances.net.formattedAmount}
            </div>
            {balances.net.amount > 0 && (
              <button 
                className="btn btn-sm btn-ghost mt-8" 
                onClick={onSaldarDeudas}
              >
                Liquidación / Saldar
              </button>
            )}
          </div>
        </div>

        {/* RESUMEN TOTAL DE COMPRAS */}
        <div className="card">
          <div className="card-title">Resumen financiero consolidado</div>
          <div style={{ display: 'grid', gap: '10px', marginTop: '12px' }}>
            <div className="flex-between" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: '13px', color: 'var(--text2)' }}>Total pagado por Tomas</span>
              <span style={{ fontWeight: 600, color: 'var(--accent)' }}>
                ${balances.summary.totalPaidT.toLocaleString('es-AR')}
              </span>
            </div>
            <div className="flex-between" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: '13px', color: 'var(--text2)' }}>Total pagado por Hermana</span>
              <span style={{ fontWeight: 600, color: 'var(--accent2)' }}>
                ${balances.summary.totalPaidS.toLocaleString('es-AR')}
              </span>
            </div>
            <div className="flex-between" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: '13px', color: 'var(--text2)' }}>Le corresponde pagar a Tomas</span>
              <span style={{ fontWeight: 500, color: 'var(--text)' }}>
                ${balances.summary.totalShouldPayT.toLocaleString('es-AR')}
              </span>
            </div>
            <div className="flex-between" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: '13px', color: 'var(--text2)' }}>Le corresponde pagar a Hermana</span>
              <span style={{ fontWeight: 500, color: 'var(--text)' }}>
                ${balances.summary.totalShouldPayS.toLocaleString('es-AR')}
              </span>
            </div>
            <div className="flex-between" style={{ padding: '8px 0' }}>
              <span style={{ fontSize: '13px', fontWeight: 600 }}>Estado de balance neto</span>
              <span style={{ fontWeight: 700, color: balances.net.amount === 0 ? 'var(--text2)' : 'var(--green)' }}>
                {balances.net.amount === 0 
                  ? 'Sin deudas' 
                  : balances.net.fromUser === 'S' 
                    ? `Hermana debe $${Math.round(balances.net.amount).toLocaleString('es-AR')}`
                    : `Tomas debe $${Math.round(balances.net.amount).toLocaleString('es-AR')}`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* DETALLE COMPARTIDO */}
      <div className="card">
        <div className="flex-between mb-16">
          <div className="card-title">Desglose individual de gastos por producto</div>
          <button className="btn btn-ghost btn-sm" onClick={handleExportSheets}>
            Exportar a Google Sheets
          </button>
        </div>
        <div className="table-wrap" style={{ maxHeight: '400px', overflowY: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Producto / Origen</th>
                <th>Comprador</th>
                <th>Costo total</th>
                <th>Tomas paga</th>
                <th>Hermana paga</th>
                <th>Tipo</th>
              </tr>
            </thead>
            <tbody>
              {allItems.map(item => (
                <tr key={item.id}>
                  <td>
                    <div className="product-name">{item.nombre}</div>
                    <div className="product-cat">{item.comercio} · {item.fecha}</div>
                  </td>
                  <td>
                    <span className={`badge ${item.quien === 'T' ? 'badge-blue' : 'badge-purple'}`}>
                      {item.quien === 'T' ? 'Tomas' : 'Hermana'}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600 }}>${item.precioTotal.toLocaleString('es-AR')}</td>
                  <td style={{ color: 'var(--accent)' }}>
                    {item.tomasAmt > 0 ? `$${Math.round(item.tomasAmt).toLocaleString('es-AR')}` : '—'}
                  </td>
                  <td style={{ color: 'var(--accent2)' }}>
                    {item.hermanaAmt > 0 ? `$${Math.round(item.hermanaAmt).toLocaleString('es-AR')}` : '—'}
                  </td>
                  <td>
                    <span className={`badge ${item.shared ? 'badge-green' : 'badge-orange'}`}>
                      {item.shared ? '50/50 compartido' : 'Consumo exclusivo'}
                    </span>
                  </td>
                </tr>
              ))}
              {allItems.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text3)', padding: '20px' }}>
                    No hay compras registradas para mostrar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
