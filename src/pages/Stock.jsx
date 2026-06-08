import React, { useState } from 'react';

export default function Stock({ products, onAddProduct, onConsumeProduct, house, onUpdateCategories }) {
  const [filterCat, setFilterCat] = useState('todos');
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [isManageCatsOpen, setIsManageCatsOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  // Campos del formulario de nuevo producto
  const [prodName, setProdName] = useState('');
  const [prodCat, setProdCat] = useState('despensa');
  const [prodUnit, setProdUnit] = useState('unidades');
  const [prodStock, setProdStock] = useState('0');
  const [prodMin, setProdMin] = useState('1');
  const [consumers, setConsumers] = useState({ T: true, S: true });

  // Categorías del hogar (leídas de Firestore o con fallback local)
  const houseCategories = house?.categories || ['lácteos', 'carnes', 'verduras', 'despensa', 'bebidas', 'limpieza', 'perfumería'];
  const categories = ['todos', ...houseCategories];

  // Emojis dinámicos por palabra clave o fallback
  const getCatEmoji = (cat) => {
    const c = cat.toLowerCase();
    if (c === 'todos') return '📦 Todos';
    if (c.includes('lácteo') || c.includes('leche')) return '🥛 ' + cat;
    if (c.includes('carne') || c.includes('milanesa')) return '🥩 ' + cat;
    if (c.includes('verdura') || c.includes('fruta')) return '🥦 ' + cat;
    if (c.includes('despensa') || c.includes('almacen')) return '🧂 ' + cat;
    if (c.includes('bebida') || c.includes('gaseosa')) return '🥤 ' + cat;
    if (c.includes('limpieza')) return '🧹 ' + cat;
    if (c.includes('perfumería') || c.includes('baño') || c.includes('aseo')) return '🧼 ' + cat;
    return '🏷️ ' + cat; // Fallback para categorías custom
  };

  const filteredProducts = filterCat === 'todos' 
    ? products 
    : products.filter(p => p.cat === filterCat);

  const handleOpenAddProduct = () => {
    setIsAddProductOpen(true);
    setProdName('');
    setProdCat(houseCategories[0] || 'despensa');
    setProdUnit('unidades');
    setProdStock('0');
    setProdMin('1');
    
    // Inicializar consumidores basados en los miembros reales de la casa
    const initialConsumers = {};
    house.members.forEach(uid => {
      initialConsumers[uid] = true;
    });
    setConsumers(initialConsumers);
  };

  const handleAddProduct = () => {
    if (!prodName.trim()) return;
    
    const consList = Object.keys(consumers).filter(uid => consumers[uid]);

    onAddProduct({
      nombre: prodName.trim(),
      cat: prodCat,
      unit: prodUnit,
      stock: parseFloat(prodStock) || 0,
      minStock: parseFloat(prodMin) || 1,
      consumidores: consList.length > 0 ? consList : house.members
    });

    setIsAddProductOpen(false);
  };

  const handleConsume = (p) => {
    const amt = p.unit === 'kg' || p.unit === 'L' || p.unit === 'g' || p.unit === 'ml' 
      ? (p.unit === 'kg' || p.unit === 'L' ? 0.25 : 100)
      : 1;
    
    if (p.stock >= amt) {
      onConsumeProduct(p.id, amt);
    }
  };

  // Agregar una nueva categoría a la casa
  const handleAddCategory = (e) => {
    e.preventDefault();
    const cleanCatName = newCatName.trim().toLowerCase();
    if (!cleanCatName || houseCategories.includes(cleanCatName)) return;

    const updated = [...houseCategories, cleanCatName];
    if (onUpdateCategories) {
      onUpdateCategories(updated);
    }
    setNewCatName('');
  };

  // Eliminar una categoría
  const handleRemoveCategory = (catToRemove) => {
    const updated = houseCategories.filter(c => c !== catToRemove);
    if (onUpdateCategories) {
      onUpdateCategories(updated);
    }
  };

  return (
    <div className="page active">
      <div className="page-header">
        <div className="page-title">
          Stock
          <small>Inventario disponible de la casa: {house.name}</small>
        </div>
        <div className="flex" style={{ gap: '10px' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setIsManageCatsOpen(true)}>
            ⚙️ Categorías
          </button>
          <button className="btn btn-primary btn-sm" onClick={handleOpenAddProduct}>
            + Producto
          </button>
        </div>
      </div>

      {/* FILTROS DE CATEGORIAS */}
      <div className="flex mb-16" style={{ gap: '8px', flexWrap: 'wrap' }}>
        {categories.map(cat => (
          <button
            key={cat}
            className={`toggle-btn ${filterCat === cat ? 'active' : ''}`}
            onClick={() => setFilterCat(cat)}
          >
            {getCatEmoji(cat)}
          </button>
        ))}
      </div>

      {/* TABLA DE INVENTARIO */}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Producto</th>
              <th>Categoría</th>
              <th>Stock actual</th>
              <th>Estado</th>
              <th>Consumidores</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map(p => {
              const pct = Math.min(100, Math.round((p.stock / Math.max(p.minStock, 1)) * 100));
              const statusColor = p.stock <= 0 ? 'red' : p.stock <= p.minStock ? 'orange' : 'green';
              const statusText = p.stock <= 0 ? 'Agotado' : p.stock <= p.minStock ? 'Stock bajo' : 'OK';

              return (
                <tr key={p.id}>
                  <td>
                    <div className="product-name">{p.nombre}</div>
                    <div className="product-cat">{p.unit}</div>
                  </td>
                  <td>
                    <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text3)', fontWeight: 600 }}>
                      {p.cat}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>
                      {p.stock} {p.unit === 'unidades' ? 'un' : p.unit}
                    </div>
                    <div className="progress-wrap mt-8" style={{ width: '80px' }}>
                      <div className={`progress-bar ${statusColor}`} style={{ width: `${pct}%` }}></div>
                    </div>
                  </td>
                  <td>
                    <span className={`badge badge-${statusColor}`}>{statusText}</span>
                  </td>
                  <td>
                    <div className="flex" style={{ gap: '4px' }}>
                      {p.consumidores.map(uid => (
                        <span key={uid} className={`badge ${uid === house.owner ? 'badge-blue' : 'badge-purple'}`}>
                          {house.membersInfo[uid]?.name || 'Miembro'}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <button 
                      className="btn btn-xs btn-ghost" 
                      onClick={() => handleConsume(p)}
                      disabled={p.stock <= 0}
                      style={{ opacity: p.stock <= 0 ? 0.4 : 1 }}
                    >
                      - Consumir
                    </button>
                  </td>
                </tr>
              );
            })}
            {filteredProducts.length === 0 && (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text3)', padding: '30px' }}>
                  No hay productos registrados en esta categoría.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL: AGREGAR PRODUCTO */}
      <div className={`modal-overlay ${isAddProductOpen ? 'open' : ''}`} onClick={(e) => e.target.classList.contains('modal-overlay') && setIsAddProductOpen(false)}>
        <div className="modal">
          <div className="modal-header">
            <div className="modal-title">📦 Nuevo producto en inventario</div>
            <button className="btn-close" onClick={() => setIsAddProductOpen(false)}>×</button>
          </div>
          <div className="modal-body">
            
            <div className="form-group">
              <label className="form-label">Nombre del producto</label>
              <input 
                className="form-input" 
                placeholder="Ej: Fideos Codito Matarazzo 500g" 
                value={prodName}
                onChange={(e) => setProdName(e.target.value)}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Categoría</label>
                <select className="form-select" value={prodCat} onChange={(e) => setProdCat(e.target.value)}>
                  {houseCategories.map(cat => (
                    <option key={cat} value={cat}>{getCatEmoji(cat)}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Unidad de medida</label>
                <select className="form-select" value={prodUnit} onChange={(e) => setProdUnit(e.target.value)}>
                  <option value="unidades">unidades</option>
                  <option value="kg">kg (kilogramos)</option>
                  <option value="g">g (gramos)</option>
                  <option value="L">L (litros)</option>
                  <option value="ml">ml (mililitros)</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Stock inicial</label>
                <input 
                  className="form-input" 
                  type="number" 
                  step="any"
                  placeholder="0"
                  value={prodStock}
                  onChange={(e) => setProdStock(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Stock mínimo (umbral de alerta)</label>
                <input 
                  className="form-input" 
                  type="number" 
                  step="any"
                  placeholder="1"
                  value={prodMin}
                  onChange={(e) => setProdMin(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">¿Quiénes lo consumen?</label>
              <div className="flex gap-12" style={{ marginTop: '8px', flexWrap: 'wrap' }}>
                {house.members.map(uid => (
                  <label key={uid} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={!!consumers[uid]} 
                      onChange={(e) => setConsumers({ ...consumers, [uid]: e.target.checked })} 
                    />
                    {house.membersInfo[uid]?.name || 'Miembro'}
                  </label>
                ))}
              </div>
              <div className="form-hint" style={{ marginTop: '8px' }}>
                Si todos consumen, el costo de este producto en las facturas se dividirá proporcionalmente.
              </div>
            </div>

          </div>
          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={() => setIsAddProductOpen(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleAddProduct}>Guardar producto</button>
          </div>
        </div>
      </div>

      {/* MODAL: GESTIÓN DE CATEGORÍAS */}
      <div className={`modal-overlay ${isManageCatsOpen ? 'open' : ''}`} onClick={(e) => e.target.classList.contains('modal-overlay') && setIsManageCatsOpen(false)}>
        <div className="modal" style={{ maxWidth: '420px' }}>
          <div className="modal-header">
            <div className="modal-title">⚙️ Administrar Categorías</div>
            <button className="btn-close" onClick={() => setIsManageCatsOpen(false)}>×</button>
          </div>
          <div className="modal-body">
            
            <form onSubmit={handleAddCategory} className="flex mb-16" style={{ gap: '8px' }}>
              <input 
                className="form-input" 
                placeholder="Nueva categoría (ej: helados)" 
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                required
              />
              <button type="submit" className="btn btn-primary btn-sm">+</button>
            </form>

            <div style={{ display: 'grid', gap: '8px', maxHeight: '250px', overflowY: 'auto' }}>
              {houseCategories.map(cat => (
                <div 
                  key={cat} 
                  className="flex-between" 
                  style={{ 
                    padding: '8px 12px', 
                    background: 'var(--surface2)', 
                    borderRadius: 'var(--r-sm)',
                    fontSize: '13px'
                  }}
                >
                  <span>{getCatEmoji(cat)}</span>
                  <button 
                    className="ocr-del" 
                    onClick={() => handleRemoveCategory(cat)}
                    title="Eliminar categoría"
                    style={{ fontSize: '14px' }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            
            <div className="form-hint" style={{ marginTop: '12px' }}>
              Nota: Agregar o eliminar categorías se aplicará instantáneamente a todos los miembros de la casa.
            </div>

          </div>
          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={() => setIsManageCatsOpen(false)}>Cerrar</button>
          </div>
        </div>
      </div>
    </div>
  );
}
