import { useState } from 'react';
import { validate, purchaseSchema } from '../services/validation';
import { CARREFOUR_RECEIPT_ITEMS, COTO_RECEIPT_ITEMS, DIA_RECEIPT_ITEMS, JUMBO_RECEIPT_ITEMS, CHANGOMAS_RECEIPT_ITEMS } from '../db/mockDb';

const MOCK_RECEIPTS = [
  { store: 'Carrefour', items: CARREFOUR_RECEIPT_ITEMS },
  { store: 'Coto', items: COTO_RECEIPT_ITEMS },
  { store: 'Día', items: DIA_RECEIPT_ITEMS },
  { store: 'Jumbo', items: JUMBO_RECEIPT_ITEMS },
  { store: 'ChangoMás', items: CHANGOMAS_RECEIPT_ITEMS }
];

function getUserName(uid, membersInfo) {
  if (!membersInfo || !uid) return uid;
  const info = membersInfo[uid];
  const name = info?.name || info?.displayName || uid;
  const emoji = info?.emoji || '';
  return emoji + name;
}

function parseReceiptText(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const items = [];
  let storeGuess = '';

  // ── Store detection ──
  const full = text.toLowerCase();
  if (full.includes('carrefour') || full.includes('carrefo')) storeGuess = 'Carrefour';
  else if (full.includes('coto') || full.includes('coto cencosud')) storeGuess = 'Coto';
  else if (full.includes('dia') || full.includes('día')) storeGuess = 'Día';
  else if (full.includes('jumbo')) storeGuess = 'Jumbo';
  else if (full.includes('disco')) storeGuess = 'Disco';
  else if (full.includes('changomas') || full.includes('chango')) storeGuess = 'ChangoMás';
  else if (full.includes('walmart') || full.includes('wal-mart')) storeGuess = 'Walmart';
  else if (full.includes('maxiconsumo') || full.includes('maxi consumo')) storeGuess = 'MaxiConsumo';
  else if (full.includes('dia') || full.includes('día')) storeGuess = 'Día';
  else storeGuess = 'Ticket';

  // ── Patterns ──
  // Helps to remove QTY × PRICE patterns without eating the real price
  const BARCODE_RE = /^\d{11,14}$/;
  const SKIP_RE = /^(subtotal|total|iva\b|efectivo|tarjeta|credito|debito|vuelto|cuit\b|resp\b|cliente|legajo|precio|cant\b|descuento|dto\b|neto|gravado|exento|no gravado|importe\b|forma de pago|cambio|vuelto|gracias|vuelva|promocion|ahorro|a pagar|articulos|unidades|ticket|factura|original|copia|comprobante)/i;
  const PRICE_END_RE = /\$?\s*([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{2})?)\s*$/;
  const WEIGHT_RE = /([0-9]+[.,]?[0-9]*)\s*(kg|g|l|ml|gr)\s*.*\$?([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{2})?)/i;
  const QTY_X_PRICE_RE = /(?:cant|^)\s*[.:]?\s*([0-9]+)\s*[x×*]\s*\$?([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{2})?)/i;
  const PRICE_ANYWHERE_RE = /\$?([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{2}))/g;

  function parsePrice(s) {
    const cleaned = s.replace(/[$.]/g, m => m === '.' ? '' : m).replace(',', '.');
    return parseFloat(cleaned) || 0;
  }

  // First pass: collect price bounds from ALL lines to detect scale
  let maxPrice = 0;
  for (const line of lines) {
    const match = line.match(PRICE_END_RE);
    if (match) {
      const p = parsePrice(match[1]);
      if (p > maxPrice) maxPrice = p;
    }
  }
  // If the biggest "price" is > 500k it's likely a total, not an item price
  const PRICE_CEIL = maxPrice > 500000 ? 200000 : 200000;

  // Merge continuation lines (lines without a price that follow a named one)
  const merged = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (SKIP_RE.test(line)) continue;
    if (BARCODE_RE.test(line.replace(/\D/g, ''))) continue;
    // Check if this line has a price at the end
    const hasPrice = PRICE_END_RE.test(line);
    if (!hasPrice && merged.length > 0) {
      // Continuation line — append to previous
      merged[merged.length - 1] += ' ' + line;
    } else {
      merged.push(line);
    }
  }

  for (const line of merged) {
    // Skip non-item lines
    if (SKIP_RE.test(line)) continue;
    if (BARCODE_RE.test(line.replace(/\D/g, ''))) continue;
    if (line.length < 4) continue;

    // ── Weight-based item ──
    const weightMatch = line.match(WEIGHT_RE);
    if (weightMatch) {
      const priceNum = parsePrice(weightMatch[3]);
      if (priceNum >= 50 && priceNum <= PRICE_CEIL) {
        let name = line.replace(weightMatch[0], '').trim();
        name = name.replace(/\s+/g, ' ').trim();
        if (name.length >= 2) {
          items.push({
            id: items.length,
            nombre: name,
            qty: parseFloat(weightMatch[1].replace(',', '.')),
            unit: weightMatch[2].toLowerCase(),
            precio: Math.round(priceNum),
            consumidores: [],
            shared: true
          });
          continue;
        }
      }
    }

    // ── QTY × PRICE pattern ──
    const qtyMatch = line.match(QTY_X_PRICE_RE);
    if (qtyMatch) {
      const priceNum = parsePrice(qtyMatch[2]);
      if (priceNum >= 50 && priceNum <= PRICE_CEIL) {
        let name = line.replace(qtyMatch[0], '').trim();
        // Also remove trailing price if any
        name = name.replace(PRICE_END_RE, '').trim();
        name = name.replace(/\s+/g, ' ').trim();
        if (name.length >= 2) {
          items.push({
            id: items.length,
            nombre: name,
            qty: parseInt(qtyMatch[1]) || 1,
            unit: 'un',
            precio: Math.round(priceNum),
            consumidores: [],
            shared: true
          });
          continue;
        }
      }
    }

    // ── Standard: ITEM $PRICE ──
    const priceMatch = line.match(PRICE_END_RE);
    if (!priceMatch) continue;

    const priceNum = parsePrice(priceMatch[1]);
    if (priceNum < 50 || priceNum > PRICE_CEIL) continue;

    let name = line.replace(PRICE_END_RE, '').trim();
    // Remove inline prices that appear mid-text
    name = name.replace(PRICE_ANYWHERE_RE, '').trim();
    name = name.replace(/\s+/g, ' ').trim();
    // Clean garbage
    name = name.replace(/^[^a-zA-ZÁÉÍÓÚÑáéíóúñ0-9]+/, '').trim();

    if (name.length < 2) continue;

    items.push({
      id: items.length,
      nombre: name,
      qty: 1,
      unit: 'un',
      precio: Math.round(priceNum),
      consumidores: [],
      shared: true
    });
  }

  return { items, storeGuess };
}

function allConsumers(members) {
  return members || [];
}

export default function Compras({ purchases, onAddPurchase, onEditPurchase, onDeletePurchase, onViewPurchaseDetail, house, user }) {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadStep, setUploadStep] = useState('upload');
  const [ocrItems, setOcrItems] = useState([]);
  const [storeName, setStoreName] = useState('Carrefour');
  const [ocrStatus, setOcrStatus] = useState('');
  const [rawText, setRawText] = useState('');
  const [showRawText, setShowRawText] = useState(false);
  const [editMode, setEditMode] = useState(null);
  const [editItems, setEditItems] = useState([]);
  const [editStore, setEditStore] = useState('');
  const [editBuyer, setEditBuyer] = useState('');
  const [editFecha, setEditFecha] = useState('');

  // Filtros de búsqueda
  const [searchQuery, setSearchQuery] = useState('');
  const [filterComercio, setFilterComercio] = useState('');
  const [filterQuien, setFilterQuien] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [filterFechaDesde, setFilterFechaDesde] = useState('');
  const [filterFechaHasta, setFilterFechaHasta] = useState('');
  const [filterPriceMin, setFilterPriceMin] = useState('');
  const [filterPriceMax, setFilterPriceMax] = useState('');

  const filteredPurchases = purchases.filter(c => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchesComercio = c.comercio?.toLowerCase().includes(q);
      const matchesItem = c.items?.some(i => i.nombre?.toLowerCase().includes(q));
      if (!matchesComercio && !matchesItem) return false;
    }
    if (filterComercio && c.comercio !== filterComercio) return false;
    if (filterQuien && c.quien !== filterQuien) return false;
    if (filterEstado && c.estado !== filterEstado) return false;
    if (filterFechaDesde && c.fecha) {
      const [d, m, y] = c.fecha.split('/');
      const fechaNum = parseInt(`${y}${m}${d}`);
      const desdeNum = parseInt(filterFechaDesde.replace(/-/g, ''));
      if (fechaNum < desdeNum) return false;
    }
    if (filterFechaHasta && c.fecha) {
      const [d, m, y] = c.fecha.split('/');
      const fechaNum = parseInt(`${y}${m}${d}`);
      const hastaNum = parseInt(filterFechaHasta.replace(/-/g, ''));
      if (fechaNum > hastaNum) return false;
    }
    if (filterPriceMin && c.total < parseFloat(filterPriceMin)) return false;
    if (filterPriceMax && c.total > parseFloat(filterPriceMax)) return false;
    return true;
  });

  const uniqueComercios = [...new Set(purchases.map(p => p.comercio).filter(Boolean))];

  const clearFilters = () => {
    setSearchQuery('');
    setFilterComercio('');
    setFilterQuien('');
    setFilterEstado('');
    setFilterFechaDesde('');
    setFilterFechaHasta('');
    setFilterPriceMin('');
    setFilterPriceMax('');
  };

  const hasActiveFilters = searchQuery || filterComercio || filterQuien || filterEstado || filterFechaDesde || filterFechaHasta || filterPriceMin || filterPriceMax;

  const membersInfo = house?.membersInfo || {};
  const members = house?.members || ['T', 'S'];
  const currentUid = user?.uid || 'T';
  const [buyer, setBuyer] = useState(currentUid);

  function defaultConsumers() {
    return [...members];
  }

  const openUploadModal = () => {
    setIsUploadModalOpen(true);
    setUploadStep('upload');
    setOcrItems([]);
    setBuyer(currentUid);
    setStoreName('Carrefour');
    setOcrStatus('');
  };

  const closeUploadModal = () => {
    setIsUploadModalOpen(false);
  };

  const handleStartOcrSimulation = () => {
    setUploadStep('loading');
    setOcrStatus('Usando datos de ejemplo...');
    setTimeout(() => {
      const pick = MOCK_RECEIPTS[Math.floor(Math.random() * MOCK_RECEIPTS.length)];
      setRawText(pick.items.map(i => `${i.nombre}  $${i.precio}`).join('\n'));
      setOcrItems(
        pick.items.map((item, idx) => ({
          id: idx,
          nombre: item.nombre,
          qty: item.qty,
          unit: item.unit,
          precio: item.precio,
          consumidores: defaultConsumers(),
          shared: true
        }))
      );
      setStoreName(pick.store);
      setOcrStatus('');
      setUploadStep('result');
    }, 800);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await runOcr(file);
  };

  const runOcr = async (file) => {
    setUploadStep('loading');
    setOcrStatus('Iniciando OCR...');

    try {
      const Tesseract = await import('tesseract.js');
      setOcrStatus('Procesando imagen con OCR...');

      const { data } = await Tesseract.recognize(file, 'spa', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            const pct = Math.round(m.progress * 100);
            setOcrStatus(`Reconociendo texto... ${pct}%`);
          }
        },
      });

      setRawText(data.text);
      setOcrStatus('Analizando ticket...');
      const { items, storeGuess } = parseReceiptText(data.text);

      if (items.length === 0) {
        setOcrStatus('No se detectaron ítems con precio. Usando simulación.');
        setTimeout(() => {
          handleStartOcrSimulation();
        }, 500);
        return;
      }

      const itemsWithConsumers = items.map(item => ({
        ...item,
        consumidores: defaultConsumers()
      }));

      setOcrItems(itemsWithConsumers);
      setStoreName(storeGuess);
      setOcrStatus('');
      setUploadStep('result');
    } catch (err) {
      console.error('OCR error:', err);
      setOcrStatus('Error en OCR. Usando datos de ejemplo.');
      setTimeout(() => {
        handleStartOcrSimulation();
      }, 500);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) await runOcr(file);
  };

  const handleItemNameChange = (id, name) => {
    setOcrItems(prev => prev.map(item => item.id === id ? { ...item, nombre: name } : item));
  };

  const handleItemPriceChange = (id, price) => {
    const val = parseFloat(price.replace(/[^0-9.-]+/g, '')) || 0;
    setOcrItems(prev => prev.map(item => item.id === id ? { ...item, precio: val } : item));
  };

  const handleToggleItemShared = (id) => {
    setOcrItems(prev => prev.map(item => {
      if (item.id === id) {
        const nextShared = !item.shared;
        return {
          ...item,
          shared: nextShared,
          consumidores: nextShared ? defaultConsumers() : [buyer]
        };
      }
      return item;
    }));
  };

  const handleToggleItemConsumer = (id, uid) => {
    setOcrItems(prev => prev.map(item => {
      if (item.id === id) {
        let nextCons = [...item.consumidores];
        if (nextCons.includes(uid)) {
          if (nextCons.length > 1) {
            nextCons = nextCons.filter(u => u !== uid);
          }
        } else {
          nextCons.push(uid);
        }
        const allSelected = members.every(m => nextCons.includes(m));
        return {
          ...item,
          consumidores: nextCons,
          shared: allSelected
        };
      }
      return item;
    }));
  };

  const openEditModal = (purchase) => {
    setEditMode(purchase);
    setEditItems(purchase.items.map((item, idx) => ({
      id: idx,
      nombre: item.nombre,
      qty: item.qty,
      unit: item.unit,
      precio: item.precio,
      consumidores: [...item.consumidores],
      shared: item.shared
    })));
    setEditStore(purchase.comercio || '');
    setEditBuyer(purchase.quien || currentUid);
    setEditFecha(purchase.fecha || '');
  };

  const closeEditModal = () => {
    setEditMode(null);
    setEditItems([]);
  };

  const handleEditItemName = (id, name) => {
    setEditItems(prev => prev.map(item => item.id === id ? { ...item, nombre: name } : item));
  };

  const handleEditItemPrice = (id, price) => {
    const val = parseFloat(price.replace(/[^0-9.-]+/g, '')) || 0;
    setEditItems(prev => prev.map(item => item.id === id ? { ...item, precio: val } : item));
  };

  const handleEditItemQty = (id, qty) => {
    const val = parseInt(qty) || 1;
    setEditItems(prev => prev.map(item => item.id === id ? { ...item, qty: Math.max(1, val) } : item));
  };

  const handleEditToggleShared = (id) => {
    setEditItems(prev => prev.map(item => {
      if (item.id === id) {
        const nextShared = !item.shared;
        return { ...item, shared: nextShared, consumidores: nextShared ? [...members] : [editBuyer] };
      }
      return item;
    }));
  };

  const handleEditToggleConsumer = (id, uid) => {
    setEditItems(prev => prev.map(item => {
      if (item.id === id) {
        let nextCons = [...item.consumidores];
        if (nextCons.includes(uid)) {
          if (nextCons.length > 1) nextCons = nextCons.filter(u => u !== uid);
        } else {
          nextCons.push(uid);
        }
        const allSelected = members.every(m => nextCons.includes(m));
        return { ...item, consumidores: nextCons, shared: allSelected };
      }
      return item;
    }));
  };

  const handleEditRemoveItem = (id) => {
    setEditItems(prev => prev.filter(item => item.id !== id));
  };

  const handleEditAddItem = () => {
    const nextId = editItems.length > 0 ? Math.max(...editItems.map(item => item.id)) + 1 : 1;
    setEditItems(prev => [...prev, {
      id: nextId, nombre: '', qty: 1, unit: 'un', precio: 0, consumidores: [...members], shared: true
    }]);
  };

  const handleSaveEdit = () => {
    const total = editItems.reduce((acc, item) => acc + (item.precio * item.qty), 0);
    if (total === 0) return;

    try {
      validate(purchaseSchema, {
        fecha: editFecha,
        comercio: editStore,
        quien: editBuyer,
        items: editItems.map(i => ({
          nombre: i.nombre,
          qty: i.qty,
          unit: i.unit,
          precio: i.precio,
          consumidores: i.consumidores,
          shared: i.shared
        })),
        total,
        estado: editMode.estado || 'confirmada'
      });
    } catch (e) {
      alert(e.message);
      return;
    }

    onEditPurchase(editMode.id, {
      comercio: editStore,
      quien: editBuyer,
      fecha: editFecha,
      items: editItems.map(i => ({
        nombre: i.nombre,
        qty: i.qty,
        unit: i.unit,
        precio: i.precio,
        consumidores: i.consumidores,
        shared: i.shared
      })),
      total
    });
    closeEditModal();
  };

  const handleDelete = (purchase) => {
    if (window.confirm(`¿Anular la compra de $${purchase.total.toLocaleString('es-AR')} en ${purchase.comercio}?`)) {
      onDeletePurchase(purchase.id);
    }
  };

  const handleRemoveItem = (id) => {
    setOcrItems(prev => prev.filter(item => item.id !== id));
  };

  const handleAddOcrItem = () => {
    const nextId = ocrItems.length > 0 ? Math.max(...ocrItems.map(item => item.id)) + 1 : 1;
    setOcrItems(prev => [
      ...prev,
      {
        id: nextId,
        nombre: 'Nuevo producto',
        qty: 1,
        unit: 'un',
        precio: 0,
        consumidores: defaultConsumers(),
        shared: true
      }
    ]);
  };

  const handleConfirmPurchase = () => {
    const total = ocrItems.reduce((acc, item) => acc + (item.precio * item.qty), 0);
    
    const newPurchase = {
      fecha: new Date().toLocaleDateString('es-AR'),
      comercio: storeName,
      quien: buyer,
      items: ocrItems.map(i => ({
        nombre: i.nombre,
        qty: i.qty,
        unit: i.unit,
        precio: i.precio,
        consumidores: i.consumidores,
        shared: i.shared
      })),
      total,
      estado: 'confirmada'
    };

    try {
      validate(purchaseSchema, newPurchase);
    } catch (e) {
      alert(e.message);
      return;
    }

    if (purchases.some(p => p.fecha === newPurchase.fecha && p.comercio === newPurchase.comercio)) {
      if (!window.confirm(`Ya existe una compra de ${newPurchase.comercio} para hoy. ¿Agregar de todas formas?`)) return;
    }

    onAddPurchase(newPurchase);
    setIsUploadModalOpen(false);
  };

  const total = ocrItems.reduce((acc, item) => acc + (item.precio * item.qty), 0);

  return (
    <div className="page active">
      <div className="page-header">
        <div className="page-title">
          Compras
          <small>Historial de facturas cargadas e ingresos al stock</small>
        </div>
        <button className="btn btn-primary" onClick={openUploadModal}>+ Cargar factura</button>
      </div>

      {/* BARRA DE BÚSQUEDA Y FILTROS */}
      <div className="card mb-16" style={{ padding: '12px', background: 'var(--surface2)' }}>
        <div className="flex" style={{ gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            className="form-input"
            style={{ flex: '1', minWidth: '180px' }}
            placeholder="🔍 Buscar por comercio o producto..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <select className="form-select" style={{ width: 'auto' }} value={filterComercio} onChange={(e) => setFilterComercio(e.target.value)}>
            <option value="">Todos los comercios</option>
            {uniqueComercios.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="form-select" style={{ width: 'auto' }} value={filterQuien} onChange={(e) => setFilterQuien(e.target.value)}>
            <option value="">Todos</option>
            {members.map(uid => <option key={uid} value={uid}>{getUserName(uid, membersInfo)}</option>)}
          </select>
          <select className="form-select" style={{ width: 'auto' }} value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)}>
            <option value="">Todos los estados</option>
            <option value="confirmada">Confirmada</option>
            <option value="pendiente">Pendiente</option>
            <option value="anulada">Anulada</option>
          </select>
          <input type="date" className="form-input" style={{ width: 'auto' }} value={filterFechaDesde} onChange={(e) => setFilterFechaDesde(e.target.value)} title="Desde" />
          <input type="date" className="form-input" style={{ width: 'auto' }} value={filterFechaHasta} onChange={(e) => setFilterFechaHasta(e.target.value)} title="Hasta" />
          <input type="number" className="form-input" style={{ width: '80px' }} placeholder="$ min" value={filterPriceMin} onChange={(e) => setFilterPriceMin(e.target.value)} />
          <input type="number" className="form-input" style={{ width: '80px' }} placeholder="$ max" value={filterPriceMax} onChange={(e) => setFilterPriceMax(e.target.value)} />
          {hasActiveFilters && (
            <button className="btn btn-xs btn-ghost" onClick={clearFilters} style={{ color: 'var(--red)' }}>✕ Limpiar</button>
          )}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '8px' }}>
          {filteredPurchases.length} de {purchases.length} compras
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Comercio</th>
              <th>Quién compró</th>
              <th>Detalle</th>
              <th>Total</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredPurchases.map(c => (
              <tr key={c.id}>
                <td>{c.fecha}</td>
                <td>
                  <div className="product-name">
                    {c.comercio} {c.isSettlement && <span className="badge badge-green">Liquidación</span>}
                  </div>
                </td>
                <td>
                  <span className={`badge ${c.quien === currentUid ? 'badge-blue' : 'badge-purple'}`}>
                    {getUserName(c.quien, membersInfo)}
                  </span>
                </td>
                <td>
                  {c.isSettlement ? 'Transferencia de dinero' : `${c.items.length} ítems`}
                </td>
                <td style={{ fontWeight: 600, color: 'var(--text)' }}>
                  ${c.total.toLocaleString('es-AR')}
                </td>
                <td>
                  <span className={`badge ${c.estado === 'confirmada' ? 'badge-green' : c.estado === 'anulada' ? 'badge-red' : 'badge-orange'}`}>
                    {c.estado}
                  </span>
                </td>
                <td>
                  <div className="flex" style={{ gap: '4px' }}>
                    <button className="btn btn-ghost btn-xs" onClick={() => onViewPurchaseDetail(c)}>
                      📋
                    </button>
                    <button className="btn btn-ghost btn-xs" onClick={() => openEditModal(c)}>
                      ✏️
                    </button>
                    <button className="btn btn-ghost btn-xs" style={{ color: 'var(--red)' }} onClick={() => handleDelete(c)}>
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredPurchases.length === 0 && (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text3)', padding: '40px' }}>
                  {hasActiveFilters
                    ? 'No se encontraron compras con esos filtros.'
                    : 'No hay compras registradas. Cargá tu primera factura con el botón de arriba.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className={`modal-overlay ${isUploadModalOpen ? 'open' : ''}`} onClick={(e) => e.target.classList.contains('modal-overlay') && closeUploadModal()}>
        <div className="modal" style={{ maxWidth: uploadStep === 'result' ? '640px' : '520px' }}>
          <div className="modal-header">
            <div className="modal-title">🛒 Cargar nueva compra</div>
            <button className="btn-close" onClick={closeUploadModal}>×</button>
          </div>
          <div className="modal-body" style={{ padding: '20px' }}>
            
            {uploadStep === 'upload' && (
              <div id="upload-step">
                <div 
                  className="upload-zone" 
                  id="dropzone" 
                  onClick={() => document.getElementById('file-input-page').click()}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                >
                  <input type="file" id="file-input-page" accept="image/*" onChange={handleFileChange} />
                  <div className="upload-icon">📄</div>
                  <div className="upload-text">Arrastrá tu factura o tocá para elegir</div>
                  <div className="upload-sub">JPG o PNG · OCR automático</div>
                </div>
                <div className="mt-12" style={{ textAlign: 'center', display: 'flex', gap: '8px', justifyContent: 'center' }}>
                  <button className="btn btn-ghost btn-sm" onClick={handleStartOcrSimulation}>
                    🧪 Usar factura de ejemplo
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => {
                    setOcrItems([{ id: 0, nombre: '', qty: 1, unit: 'un', precio: 0, consumidores: defaultConsumers(), shared: true }]);
                    setStoreName('');
                    setUploadStep('result');
                  }}>
                    ✏️ Cargar manual
                  </button>
                </div>
              </div>
            )}

            {uploadStep === 'loading' && (
              <div className="ai-thinking" id="ocr-loading" style={{ justifyContent: 'center', padding: '40px 20px' }}>
                <div className="dots"><div className="dot"></div><div className="dot"></div><div className="dot"></div></div>
                <span style={{ fontSize: '14px', color: 'var(--text2)', fontWeight: 500 }}>
                  {ocrStatus || 'Procesando...'}
                </span>
              </div>
            )}

            {uploadStep === 'result' && (
              <div id="ocr-step">
                <div className="flex-between mb-16" style={{ background: 'var(--surface2)', padding: '12px', borderRadius: 'var(--r-sm)' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>
                      {ocrStatus ? '📄 Datos de ejemplo' : '📸 Factura escaneada'}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '2px' }}>
                      Revisá los ítems y asigná consumidores antes de confirmar.
                    </div>
                  </div>
                  <span className="badge badge-blue">{storeName || 'Sin comercio'} · Hoy</span>
                </div>

                {rawText && (
                  <div style={{ marginBottom: '12px' }}>
                    <button
                      className="btn btn-ghost btn-xs"
                      style={{ fontSize: '11px', color: 'var(--text3)' }}
                      onClick={() => setShowRawText(!showRawText)}
                    >
                      {showRawText ? '🙈 Ocultar texto crudo' : '📝 Ver texto crudo del OCR'}
                    </button>
                    {showRawText && (
                      <pre style={{
                        marginTop: '8px', padding: '10px', fontSize: '11px',
                        background: 'var(--surface2)', borderRadius: '8px',
                        maxHeight: '150px', overflowY: 'auto', whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all', lineHeight: '1.4', color: 'var(--text2)'
                      }}>
                        {rawText}
                      </pre>
                    )}
                  </div>
                )}

                <div className="form-row mb-16">
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">¿Quién pagó?</label>
                    <select className="form-select" value={buyer} onChange={(e) => setBuyer(e.target.value)}>
                      {members.map(uid => (
                        <option key={uid} value={uid}>{getUserName(uid, membersInfo)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Comercio</label>
                    <input className="form-input" value={storeName} onChange={(e) => setStoreName(e.target.value)} />
                  </div>
                </div>

                <div className="card-title mb-8">Ítems ({ocrItems.length})</div>
                <div id="ocr-items" style={{ maxHeight: '250px', overflowY: 'auto', paddingRight: '4px', marginBottom: '12px' }}>
                  {ocrItems.map((item) => (
                    <div className="ocr-item" key={item.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px', height: 'auto' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                        <input 
                          value={item.nombre} 
                          onChange={(e) => handleItemNameChange(item.id, e.target.value)}
                          style={{ fontWeight: 500, fontSize: '13px' }}
                          placeholder="Nombre del producto"
                        />
                        <span className="qty" style={{ fontSize: '12px' }}>x{item.qty}</span>
                        <input 
                          className="price" 
                          value={`$${item.precio}`} 
                          onChange={(e) => handleItemPriceChange(item.id, e.target.value)}
                          style={{ width: '80px', fontWeight: 600 }}
                        />
                        <button className="ocr-del" onClick={() => handleRemoveItem(item.id)}>×</button>
                      </div>
                      
                      <div className="flex" style={{ gap: '6px', paddingLeft: '4px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text3)' }}>Consumidores:</span>
                        {members.map(uid => (
                          <button 
                            key={uid}
                            className={`btn btn-xs ${item.consumidores.includes(uid) ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ padding: '2px 6px', fontSize: '10px' }}
                            onClick={() => handleToggleItemConsumer(item.id, uid)}
                          >
                            {getUserName(uid, membersInfo)}
                          </button>
                        ))}
                        <span 
                          className={`badge ${item.shared ? 'badge-green' : 'badge-orange'}`}
                          style={{ marginLeft: 'auto', fontSize: '10px', padding: '1px 6px', cursor: 'pointer' }}
                          onClick={() => handleToggleItemShared(item.id)}
                        >
                          {item.shared ? 'Compartido' : 'Consumo exclusivo'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex-between">
                  <button className="btn btn-ghost btn-sm" onClick={handleAddOcrItem}>+ Agregar ítem</button>
                  <div style={{ fontWeight: 700, fontSize: '15px' }}>
                    Total: ${total.toLocaleString('es-AR')}
                  </div>
                </div>
              </div>
            )}

          </div>
          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={closeUploadModal}>Cancelar</button>
            {uploadStep === 'result' && (
              <button className="btn btn-primary" onClick={handleConfirmPurchase} disabled={ocrItems.length === 0}>
                Confirmar compra
              </button>
            )}
          </div>
        </div>
      </div>

      {/* MODAL: EDITAR COMPRA */}
      <div className={`modal-overlay ${editMode ? 'open' : ''}`} onClick={(e) => e.target.classList.contains('modal-overlay') && closeEditModal()}>
        <div className="modal" style={{ maxWidth: '640px' }}>
          <div className="modal-header">
            <div className="modal-title">✏️ Editar compra</div>
            <button className="btn-close" onClick={closeEditModal}>×</button>
          </div>
          <div className="modal-body" style={{ padding: '20px' }}>
            <div className="form-row mb-16">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Fecha</label>
                <input className="form-input" value={editFecha} onChange={(e) => setEditFecha(e.target.value)} placeholder="dd/mm/aaaa" />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Comercio</label>
                <input className="form-input" value={editStore} onChange={(e) => setEditStore(e.target.value)} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">¿Quién pagó?</label>
                <select className="form-select" value={editBuyer} onChange={(e) => setEditBuyer(e.target.value)}>
                  {members.map(uid => (
                    <option key={uid} value={uid}>{getUserName(uid, membersInfo)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="card-title mb-8">Ítems ({editItems.length})</div>
            <div style={{ maxHeight: '300px', overflowY: 'auto', paddingRight: '4px', marginBottom: '12px' }}>
              {editItems.map((item) => (
                <div className="ocr-item" key={item.id} style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%' }}>
                    <input
                      value={item.nombre}
                      onChange={(e) => handleEditItemName(item.id, e.target.value)}
                      style={{ fontWeight: 500, fontSize: '13px', flex: 1 }}
                      placeholder="Nombre del producto"
                    />
                    <input
                      type="number"
                      min="1"
                      value={item.qty}
                      onChange={(e) => handleEditItemQty(item.id, e.target.value)}
                      style={{ width: '50px', fontSize: '12px', textAlign: 'center' }}
                    />
                    <input
                      className="price"
                      value={`$${item.precio}`}
                      onChange={(e) => handleEditItemPrice(item.id, e.target.value)}
                      style={{ width: '80px', fontWeight: 600 }}
                    />
                    <button className="ocr-del" onClick={() => handleEditRemoveItem(item.id)}>×</button>
                  </div>
                  <div className="flex" style={{ gap: '6px', paddingLeft: '4px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text3)' }}>Consumidores:</span>
                    {members.map(uid => (
                      <button
                        key={uid}
                        className={`btn btn-xs ${item.consumidores.includes(uid) ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ padding: '2px 6px', fontSize: '10px' }}
                        onClick={() => handleEditToggleConsumer(item.id, uid)}
                      >
                        {getUserName(uid, membersInfo)}
                      </button>
                    ))}
                    <span
                      className={`badge ${item.shared ? 'badge-green' : 'badge-orange'}`}
                      style={{ marginLeft: 'auto', fontSize: '10px', padding: '1px 6px', cursor: 'pointer' }}
                      onClick={() => handleEditToggleShared(item.id)}
                    >
                      {item.shared ? 'Compartido' : 'Exclusivo'}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex-between">
              <button className="btn btn-ghost btn-sm" onClick={handleEditAddItem}>+ Agregar ítem</button>
              <div style={{ fontWeight: 700, fontSize: '15px' }}>
                Total: ${editItems.reduce((acc, i) => acc + (i.precio * i.qty), 0).toLocaleString('es-AR')}
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={closeEditModal}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleSaveEdit}>Guardar cambios</button>
          </div>
        </div>
      </div>
    </div>
  );
}
