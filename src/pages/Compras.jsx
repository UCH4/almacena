import React, { useState } from 'react';
import { CARREFOUR_RECEIPT_ITEMS } from '../db/mockDb';

export default function Compras({ purchases, onAddPurchase, onViewPurchaseDetail }) {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadStep, setUploadStep] = useState('upload'); // 'upload', 'loading', 'result'
  const [ocrItems, setOcrItems] = useState([]);
  const [buyer, setBuyer] = useState('T'); // 'T' = Tomas, 'S' = Hermana
  const [storeName, setStoreName] = useState('Carrefour');

  // Abrir y reiniciar modal
  const openUploadModal = () => {
    setIsUploadModalOpen(true);
    setUploadStep('upload');
    setOcrItems([]);
    setBuyer('T');
    setStoreName('Carrefour');
  };

  const closeUploadModal = () => {
    setIsUploadModalOpen(false);
  };

  // Simulación de OCR
  const handleStartOcrSimulation = () => {
    setUploadStep('loading');
    setTimeout(() => {
      // Cargar los items del ticket de Carrefour (prorrateados)
      setOcrItems(
        CARREFOUR_RECEIPT_ITEMS.map((item, idx) => ({
          id: idx,
          nombre: item.nombre,
          qty: item.qty,
          unit: item.unit,
          precio: item.precio,
          consumidores: ['T', 'S'], // Compartido por defecto
          shared: true
        }))
      );
      setStoreName('Carrefour');
      setUploadStep('result');
    }, 1800);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleStartOcrSimulation();
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleStartOcrSimulation();
    }
  };

  // Editar ítems del OCR
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
          consumidores: nextShared ? ['T', 'S'] : [buyer] // Si no es compartido, se asigna al comprador por defecto
        };
      }
      return item;
    }));
  };

  const handleToggleItemConsumer = (id, user) => {
    setOcrItems(prev => prev.map(item => {
      if (item.id === id) {
        let nextCons = [...item.consumidores];
        if (nextCons.includes(user)) {
          // No permitir dejar vacío si es exclusivo
          if (nextCons.length > 1) {
            nextCons = nextCons.filter(u => u !== user);
          }
        } else {
          nextCons.push(user);
        }
        const isShared = nextCons.includes('T') && nextCons.includes('S');
        return {
          ...item,
          consumidores: nextCons,
          shared: isShared
        };
      }
      return item;
    }));
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
        consumidores: ['T', 'S'],
        shared: true
      }
    ]);
  };

  // Confirmar compra
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

    onAddPurchase(newPurchase);
    setIsUploadModalOpen(false);
  };

  return (
    <div className="page active">
      <div className="page-header">
        <div className="page-title">
          Compras
          <small>Historial de facturas cargadas e ingresos al stock</small>
        </div>
        <button className="btn btn-primary" onClick={openUploadModal}>+ Cargar factura</button>
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
            {purchases.map(c => (
              <tr key={c.id}>
                <td>{c.fecha}</td>
                <td>
                  <div className="product-name">
                    {c.comercio} {c.isSettlement && <span className="badge badge-green">Liquidación</span>}
                  </div>
                </td>
                <td>
                  <span className={`badge ${c.quien === 'T' ? 'badge-blue' : 'badge-purple'}`}>
                    {c.quien === 'T' ? 'Tomas' : 'Hermana'}
                  </span>
                </td>
                <td>
                  {c.isSettlement ? 'Transferencia de dinero' : `${c.items.length} ítems`}
                </td>
                <td style={{ fontWeight: 600, color: 'var(--text)' }}>
                  ${c.total.toLocaleString('es-AR')}
                </td>
                <td>
                  <span className={`badge ${c.estado === 'confirmada' ? 'badge-green' : 'badge-orange'}`}>
                    {c.estado}
                  </span>
                </td>
                <td>
                  <button className="btn btn-ghost btn-xs" onClick={() => onViewPurchaseDetail(c)}>
                    Ver detalle
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL: CARGAR COMPRA */}
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
                  <input type="file" id="file-input-page" accept="image/*,.pdf" onChange={handleFileChange} />
                  <div className="upload-icon">📄</div>
                  <div className="upload-text">Arrastrá tu factura o tocá para elegir</div>
                  <div className="upload-sub">JPG, PNG o PDF · máx 10 MB</div>
                </div>
                <div className="mt-12" style={{ textAlign: 'center' }}>
                  <button className="btn btn-ghost btn-sm" onClick={handleStartOcrSimulation}>
                    🧪 Simular con factura Carrefour (receipt_1780595133000.pdf)
                  </button>
                </div>
              </div>
            )}

            {uploadStep === 'loading' && (
              <div className="ai-thinking" id="ocr-loading" style={{ justifyContent: 'center', padding: '40px 20px' }}>
                <div className="dots"><div className="dot"></div><div className="dot"></div><div className="dot"></div></div>
                <span style={{ fontSize: '14px', color: 'var(--text2)', fontWeight: 500 }}>
                  Claude API leyendo ticket de Carrefour y extrayendo ítems...
                </span>
              </div>
            )}

            {uploadStep === 'result' && (
              <div id="ocr-step">
                <div className="flex-between mb-16" style={{ background: 'var(--surface2)', padding: '12px', borderRadius: 'var(--r-sm)' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>Factura extraída por IA ✨</div>
                    <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '2px' }}>
                      Prorrateamos el descuento del 15% de Mercado Pago en los precios unitarios.
                    </div>
                  </div>
                  <span className="badge badge-blue">{storeName} · Hoy</span>
                </div>

                <div className="form-row mb-16">
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">¿Quién realizó el pago?</label>
                    <select className="form-select" value={buyer} onChange={(e) => setBuyer(e.target.value)}>
                      <option value="T">Tomas</option>
                      <option value="S">Hermana</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Comercio</label>
                    <input className="form-input" value={storeName} onChange={(e) => setStoreName(e.target.value)} />
                  </div>
                </div>

                <div className="card-title mb-8">Ítems de la factura ({ocrItems.length})</div>
                <div id="ocr-items" style={{ maxHeight: '250px', overflowY: 'auto', paddingRight: '4px', marginBottom: '12px' }}>
                  {ocrItems.map((item, idx) => (
                    <div className="ocr-item" key={item.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px', height: 'auto' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                        <input 
                          value={item.nombre} 
                          onChange={(e) => handleItemNameChange(item.id, e.target.value)}
                          style={{ fontWeight: 500, fontSize: '13px' }}
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
                      
                      {/* Asignación de consumidores */}
                      <div className="flex" style={{ gap: '6px', paddingLeft: '4px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text3)' }}>Consumidores:</span>
                        <button 
                          className={`btn btn-xs ${item.consumidores.includes('T') ? 'btn-primary' : 'btn-secondary'}`}
                          style={{ padding: '2px 6px', fontSize: '10px' }}
                          onClick={() => handleToggleItemConsumer(item.id, 'T')}
                        >
                          Tomas
                        </button>
                        <button 
                          className={`btn btn-xs ${item.consumidores.includes('S') ? 'btn-primary' : 'btn-secondary'}`}
                          style={{ padding: '2px 6px', fontSize: '10px' }}
                          onClick={() => handleToggleItemConsumer(item.id, 'S')}
                        >
                          Hermana
                        </button>
                        <span 
                          className={`badge ${item.shared ? 'badge-green' : 'badge-orange'}`}
                          style={{ marginLeft: 'auto', fontSize: '10px', padding: '1px 6px' }}
                          onClick={() => handleToggleItemShared(item.id)}
                          role="button"
                        >
                          {item.shared ? '50/50 compartido' : 'Consumo exclusivo'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex-between">
                  <button className="btn btn-ghost btn-sm" onClick={handleAddOcrItem}>+ Agregar ítem</button>
                  <div style={{ fontWeight: 700, fontSize: '15px' }}>
                    Total: ${ocrItems.reduce((acc, item) => acc + (item.precio * item.qty), 0).toLocaleString('es-AR')}
                  </div>
                </div>
              </div>
            )}

          </div>
          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={closeUploadModal}>Cancelar</button>
            {uploadStep === 'result' && (
              <button className="btn btn-primary" onClick={handleConfirmPurchase}>Confirmar compra</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
