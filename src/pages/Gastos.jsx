import { useState, useMemo } from 'react';
import { dbProvider } from '../db/dbProvider';
import AdBanner from '../components/AdBanner';


function getUserName(uid, membersInfo) {
  if (!membersInfo || !uid) return uid;
  const info = membersInfo[uid];
  const name = info?.name || info?.displayName || uid;
  const emoji = info?.emoji || '';
  return emoji + name;
}

function toCSV(headers, rows) {
  const esc = v => `"${String(v || '').replace(/"/g, '""')}"`;
  const header = headers.map(esc).join(',');
  const body = rows.map(r => r.map(esc).join(','));
  return header + '\n' + body.join('\n');
}

function downloadCSV(filename, csv) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Gastos({ purchases, balances, onSaldarDeudas, showToast, house, products, user }) {
  const [sheetsOpen, setSheetsOpen] = useState(false);
  const [sheetUrl, setSheetUrl] = useState(house?.sheetUrl || '');
  const [webhookUrl, setWebhookUrl] = useState(house?.webhookUrl || '');
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [monthFilter, setMonthFilter] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const membersInfo = house?.membersInfo || {};
  const members = house?.members || [user?.uid || 'T'];
  const currentUid = user?.uid || members[0];
  const currentName = getUserName(currentUid, membersInfo);
  const otherUid = members.find(uid => uid !== currentUid) || members[0];
  const otherName = getUserName(otherUid, membersInfo);

  function computeMemberSplit(item, membersList) {
    const totalCost = item.precio * item.qty;
    const consumers = item.consumidores || [];
    const activeConsumers = consumers.filter(c => membersList.includes(c));
    const count = activeConsumers.length;
    const byMember = {};
    if (item.shared || count >= 2) {
      const share = totalCost / Math.max(count, 1);
      activeConsumers.forEach(uid => { byMember[uid] = (byMember[uid] || 0) + share; });
    } else if (count === 1) {
      byMember[activeConsumers[0]] = totalCost;
    }
    return byMember;
  }

  const allItems = useMemo(() => {
    const items = [];
    purchases.forEach(p => {
      if (p.isSettlement || p.estado !== 'confirmada') return;
      p.items.forEach(item => {
        const totalCost = item.precio * item.qty;
        const byMember = computeMemberSplit(item, members);
        items.push({
          id: `${p.id}-${item.nombre}`,
          comercio: p.comercio,
          fecha: p.fecha,
          quien: p.quien,
          nombre: item.nombre,
          qty: item.qty,
          unit: item.unit,
          precioTotal: totalCost,
          byMember,
          shared: Object.keys(byMember).length > 1
        });
      });
    });
    return items;
  }, [purchases, members]);

  const filteredItems = useMemo(() => {
    return allItems.filter(i => i.fecha && i.fecha.startsWith(monthFilter));
  }, [allItems, monthFilter]);

  const monthlySummary = useMemo(() => {
    const mb = house?.monthlyBalances || {};
    const monthData = mb[monthFilter];
    const membersPaid = {};
    members.forEach(uid => { membersPaid[uid] = 0; });

    if (monthData && monthData.byMember) {
      let general = 0;
      members.forEach(uid => {
        membersPaid[uid] = Math.round((monthData.byMember[uid]?.paid || 0) * 100) / 100;
        general += membersPaid[uid];
      });
      return { total: { general, membersPaid }, storeRank: [] };
    }

    const general = filteredItems.reduce((acc, i) => acc + i.precioTotal, 0);
    members.forEach(uid => {
      membersPaid[uid] = filteredItems
        .filter(i => i.quien === uid)
        .reduce((acc, i) => acc + i.precioTotal, 0);
    });

    const stores = {};
    for (const i of filteredItems) {
      const key = i.comercio || 'Sin comercio';
      stores[key] = (stores[key] || 0) + i.precioTotal;
    }
    const storeRank = Object.entries(stores).sort((a, b) => b[1] - a[1]);
    return { total: { general, membersPaid }, storeRank };
  }, [filteredItems, house?.monthlyBalances, monthFilter, members]);

  const handleSaveSheetUrl = async () => {
    setSaving(true);
    try {
      await dbProvider.updateHouseSheetUrl(house.id, sheetUrl);
      showToast('✅ URL de Google Sheets guardada', 'success');
    } catch {
      showToast('❌ Error al guardar', 'error');
    }
    setSaving(false);
  };

  const handleSaveWebhookUrl = async () => {
    setSaving(true);
    try {
      await dbProvider.updateHouseWebhookUrl(house.id, webhookUrl);
      showToast('✅ URL de Webhook guardada', 'success');
    } catch {
      showToast('❌ Error al guardar', 'error');
    }
    setSaving(false);
  };

  const handleSyncNow = async () => {
    if (!webhookUrl) {
      showToast('⚠️ Configurá la URL del webhook primero', 'info');
      return;
    }
    setSyncing(true);
    try {
      const purchasesData = filteredItems.map(i => ({
        fecha: i.fecha,
        comercio: i.comercio,
        comprador: getUserName(i.quien, membersInfo),
        producto: i.nombre,
        cantidad: i.qty,
        unidad: i.unit,
        precioTotal: i.precioTotal,
        [currentName]: Math.round(i.byMember[currentUid] || 0),
        [otherName]: Math.round(i.byMember[otherUid] || 0),
        tipo: i.shared ? 'Compartido' : 'Exclusivo'
      }));

      const productsData = (products || []).map(p => ({
        nombre: p.nombre,
        categoria: p.cat,
        stock: p.stock,
        unidad: p.unit,
        stockMinimo: p.minStock || 1
      }));

      const summary = {
        totalGastado: balances.summary ? (balances.summary.currentPaid || 0) + (balances.summary.otherPaid || 0) : 0,
        balanceNeto: balances.net.amount || 0,
        fechaActualizacion: new Date().toISOString()
      };

      await dbProvider.syncToWebhook(house.id, {
        purchases: purchasesData,
        products: productsData,
        summary
      });
      showToast('✅ Datos sincronizados con Google Sheets', 'success');
    } catch (e) {
      showToast(`❌ Error de sincronización: ${e.message}`, 'error');
    }
    setSyncing(false);
  };

  const handleExportPurchases = () => {
    const headers = ['Fecha', 'Comercio', 'Comprador', 'Producto', 'Cant.', 'Precio Total', `${currentName} Paga`, `${otherName} Paga`, 'Tipo'];
    const rows = filteredItems.map(i => [
      i.fecha, i.comercio, getUserName(i.quien, membersInfo),
      i.nombre, `${i.qty} ${i.unit}`, i.precioTotal,
      Math.round(i.byMember[currentUid] || 0), Math.round(i.byMember[otherUid] || 0),
      i.shared ? 'Compartido' : 'Exclusivo'
    ]);
    const csv = toCSV(headers, rows);
    downloadCSV(`alacena-gastos-${monthFilter}.csv`, csv);
    showToast(`📥 CSV de gastos ${monthFilter} descargado`, 'success');
    if (sheetUrl) showToast('📊 Pegá el CSV en tu Google Sheet', 'info');
  };

  const handleExportStock = () => {
    if (!products || products.length === 0) {
      showToast('⚠️ No hay productos en stock', 'error');
      return;
    }
    const headers = ['Producto', 'Categoría', 'Stock', 'Unidad', 'Stock Mínimo'];
    const rows = products.map(p => [
      p.nombre, p.cat, p.stock, p.unit, p.minStock || 1
    ]);
    const csv = toCSV(headers, rows);
    downloadCSV(`alacena-stock-${new Date().toISOString().slice(0, 10)}.csv`, csv);
    showToast('📥 CSV de stock descargado', 'success');
    if (sheetUrl) showToast('📊 Pegá el CSV en tu Google Sheet', 'info');
  };

  const handleOpenSheet = () => {
    const url = sheetUrl || house?.sheetUrl;
    if (url) window.open(url, '_blank');
    else showToast('⚠️ Configurá la URL de tu Google Sheet primero', 'info');
  };

  return (
    <div className="page active">
      <div className="page-header">
        <div className="page-title">
          Gastos & Deudas
          <small>Distribución proporcional de costos y balance neto del hogar</small>
        </div>
      </div>

      <div className="grid-2 mb-20">
        <div className="card">
          <div className="card-title">Balance por miembro</div>
          <div style={{ display: 'grid', gap: '12px', marginTop: '12px' }}>
            {(balances.members || members.map(uid => ({ uid, name: getUserName(uid, membersInfo), paid: 0, shouldPay: 0, net: 0 }))).map(m => {
              const netAmount = m.net || 0;
              return (
                <div key={m.uid} className="flex-between" style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '14px' }}>{m.name || getUserName(m.uid, membersInfo)}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text3)' }}>
                      Pagó: ${Math.round(m.paid || 0).toLocaleString('es-AR')} · Debe pagar: ${Math.round(m.shouldPay || 0).toLocaleString('es-AR')}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, fontSize: '16px', color: netAmount === 0 ? 'var(--text2)' : netAmount > 0 ? 'var(--green)' : 'var(--red)' }}>
                      {netAmount > 0 ? '+' : ''}${Math.round(netAmount).toLocaleString('es-AR')}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text3)' }}>
                      {netAmount === 0 ? 'Saldado' : netAmount > 0 ? 'Saldo a favor' : 'Saldo en contra'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <hr className="sep" />
          <div className="flex-between">
            <div>
              {balances.net.amount > 0 && (
                <div style={{ fontSize: '13px', color: 'var(--text2)' }}>
                  {getUserName(balances.net.fromUser, membersInfo)} debe ${Math.round(balances.net.amount).toLocaleString('es-AR')} a {getUserName(balances.net.toUser, membersInfo)}
                </div>
              )}
            </div>
            {balances.net.amount > 0 && (
              <button className="btn btn-sm btn-primary" onClick={onSaldarDeudas}>
                💰 Saldar deuda
              </button>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-title">Resumen financiero consolidado</div>
          <div style={{ display: 'grid', gap: '10px', marginTop: '12px' }}>
            {members.map(uid => {
              const m = (balances.members || []).find(b => b.uid === uid);
              return (
                <div key={uid} className="flex-between" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text2)' }}>Total pagado por {getUserName(uid, membersInfo)}</span>
                  <span style={{ fontWeight: 600 }}>
                    ${Math.round(m?.paid || 0).toLocaleString('es-AR')}
                  </span>
                </div>
              );
            })}
            {members.map(uid => {
              const m = (balances.members || []).find(b => b.uid === uid);
              return (
                <div key={`sp-${uid}`} className="flex-between" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text2)' }}>Le corresponde pagar a {getUserName(uid, membersInfo)}</span>
                  <span style={{ fontWeight: 500, color: 'var(--text)' }}>
                    ${Math.round(m?.shouldPay || 0).toLocaleString('es-AR')}
                  </span>
                </div>
              );
            })}
            <div className="flex-between" style={{ padding: '8px 0' }}>
              <span style={{ fontSize: '13px', fontWeight: 600 }}>Estado de balance neto</span>
              <span style={{ fontWeight: 700, color: balances.net.amount === 0 ? 'var(--text2)' : 'var(--green)' }}>
                {balances.net.amount === 0
                  ? 'Sin deudas'
                  : `${getUserName(balances.net.fromUser, membersInfo)} debe $${Math.round(balances.net.amount).toLocaleString('es-AR')} a ${getUserName(balances.net.toUser, membersInfo)}`}
              </span>
            </div>
          </div>
        </div>
      </div>

      <AdBanner />

      <div className="card">
        <div className="flex-between mb-16">
          <div className="card-title">Desglose individual de gastos por producto</div>
          <button className="btn btn-ghost btn-sm" onClick={() => setSheetsOpen(true)}>
            📊 Google Sheets
          </button>
        </div>
        <div className="table-wrap" style={{ maxHeight: '400px', overflowY: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Producto / Origen</th>
                <th>Comprador</th>
                <th>Costo total</th>
                {members.map(uid => (
                  <th key={uid}>{getUserName(uid, membersInfo)} paga</th>
                ))}
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
                    <span className="badge badge-blue">{getUserName(item.quien, membersInfo)}</span>
                  </td>
                  <td style={{ fontWeight: 600 }}>${item.precioTotal.toLocaleString('es-AR')}</td>
                  {members.map(uid => (
                    <td key={uid} style={{ color: uid === currentUid ? 'var(--accent)' : 'var(--accent2)' }}>
                      {(item.byMember[uid] || 0) > 0 ? `$${Math.round(item.byMember[uid]).toLocaleString('es-AR')}` : '—'}
                    </td>
                  ))}
                  <td>
                    <span className={`badge ${item.shared ? 'badge-green' : 'badge-orange'}`}>
                      {item.shared ? 'Compartido' : 'Exclusivo'}
                    </span>
                  </td>
                </tr>
              ))}
              {allItems.length === 0 && (
                <tr>
                  <td colSpan={3 + members.length} style={{ textAlign: 'center', color: 'var(--text3)', padding: '20px' }}>
                    No hay compras registradas para mostrar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL GOOGLE SHEETS */}
      <div className={`modal-overlay ${sheetsOpen ? 'open' : ''}`} onClick={(e) => e.target.classList.contains('modal-overlay') && setSheetsOpen(false)}>
        <div className="modal" style={{ maxWidth: '520px' }}>
          <div className="modal-header">
            <div className="modal-title">📊 Google Sheets</div>
            <button className="btn-close" onClick={() => setSheetsOpen(false)}>×</button>
          </div>
          <div className="modal-body" style={{ padding: '20px' }}>
            <p style={{ fontSize: '13px', color: 'var(--text2)', marginBottom: '16px' }}>
              Vinculá tu Google Sheet y configurá el webhook de Apps Script para sincronización automática.
            </p>

            {/* ── Monthly Report ── */}
            <div style={{ marginBottom: '20px', padding: '14px', background: 'var(--surface2)', borderRadius: '10px' }}>
              <div className="flex-between mb-12">
                <label className="form-label" style={{ marginBottom: 0 }}>📆 Resumen mensual</label>
                <input
                  type="month"
                  value={monthFilter}
                  onChange={(e) => setMonthFilter(e.target.value)}
                  style={{
                    padding: '4px 8px', fontSize: '12px', borderRadius: '6px',
                    border: '1px solid var(--border)', background: 'var(--surface)',
                    color: 'var(--text1)'
                  }}
                />
              </div>
              <div style={{ fontSize: '13px', lineHeight: '1.6' }}>
                <div className="flex-between">
                  <span style={{ color: 'var(--text2)' }}>Total gastado</span>
                  <span style={{ fontWeight: 700, color: 'var(--accent)' }}>
                    ${monthlySummary.total.general.toLocaleString('es-AR')}
                  </span>
                </div>
                {members.map(uid => (
                  <div key={uid} className="flex-between">
                    <span style={{ color: 'var(--text2)' }}>Pagó <b>{getUserName(uid, membersInfo)}</b></span>
                    <span style={{ color: uid === currentUid ? 'var(--accent)' : 'var(--accent2)' }}>
                      ${(monthlySummary.total.membersPaid[uid] || 0).toLocaleString('es-AR')}
                    </span>
                  </div>
                ))}
                {monthlySummary.storeRank.length > 0 && (
                  <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text3)', marginBottom: '4px' }}>Por comercio:</div>
                    {monthlySummary.storeRank.slice(0, 4).map(([store, amount]) => (
                      <div key={store} className="flex-between" style={{ fontSize: '12px' }}>
                        <span style={{ color: 'var(--text2)' }}>{store}</span>
                        <span>${Math.round(amount).toLocaleString('es-AR')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="form-group mb-12">
              <label className="form-label">URL de tu Google Sheet</label>
              <input 
                className="form-input" 
                placeholder="https://docs.google.com/spreadsheets/d/..." 
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
              />
              <div className="form-hint" style={{ marginTop: '4px' }}>
                Solo se guarda en el hogar para acceso rápido.
              </div>
            </div>

            <button 
              className="btn btn-sm btn-primary" 
              style={{ width: '100%', marginBottom: '16px' }}
              onClick={handleSaveSheetUrl}
              disabled={saving}
            >
              {saving ? 'Guardando...' : 'Guardar URL'}
            </button>

            <hr className="sep" />

            <div className="form-group mb-12">
              <label className="form-label">URL del Webhook (Apps Script)</label>
              <input 
                className="form-input" 
                placeholder="https://script.google.com/macros/s/..." 
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
              />
              <div className="form-hint" style={{ marginTop: '4px' }}>
                URL de tu Google Apps Script desplegado como webhook. Recibe POST con compras, stock y resumen.
              </div>
            </div>

            <button 
              className="btn btn-sm btn-primary" 
              style={{ width: '100%', marginBottom: '16px' }}
              onClick={handleSaveWebhookUrl}
              disabled={saving}
            >
              {saving ? 'Guardando...' : 'Guardar Webhook'}
            </button>

            <button 
              className="btn btn-sm" 
              style={{ width: '100%', marginBottom: '16px', background: 'var(--green)', color: '#fff' }}
              onClick={handleSyncNow}
              disabled={syncing}
            >
              {syncing ? 'Sincronizando...' : '🔄 Sincronizar ahora'}
            </button>

            <hr className="sep" />

            <div style={{ display: 'grid', gap: '8px', marginTop: '12px' }}>
              <button className="btn btn-ghost" onClick={handleExportPurchases}>
                📥 Exportar gastos (CSV)
              </button>
              <button className="btn btn-ghost" onClick={handleExportStock}>
                📥 Exportar stock (CSV)
              </button>
              {sheetUrl && (
                <button className="btn btn-ghost" onClick={handleOpenSheet}>
                  🌐 Abrir Google Sheet
                </button>
              )}
            </div>

            <div style={{ marginTop: '16px', padding: '12px', background: 'var(--surface2)', borderRadius: '8px', fontSize: '12px', color: 'var(--text3)' }}>
              <strong>💡 Cómo configurar sincronización automática:</strong>
              <ol style={{ margin: '8px 0 0 16px', padding: 0 }}>
                <li>Creá un Google Sheet</li>
                <li>Andá a Extensiones → Apps Script</li>
                <li>Pegá el código de <code>google_sheets_setup.md</code></li>
                <li>Desplegá como Web App (acceso: cualquiera, incluso anónimo)</li>
                <li>Copiá la URL del webhook y pegalá acá arriba</li>
                <li>¡Usá "Sincronizar ahora" para enviar los datos!</li>
              </ol>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={() => setSheetsOpen(false)}>Cerrar</button>
          </div>
        </div>
      </div>
    </div>
  );
}
