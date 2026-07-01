import { guessCategory } from '../services/categories';

// Datos semilla iniciales (se usarán si no hay nada en localStorage)
const INITIAL_PURCHASES = [
  {
    id: 1,
    fecha: '05/06/2026',
    comercio: 'Carrefour',
    quien: 'T',
    items: [
      { nombre: 'Leche entera 1L', qty: 3, unit: 'un', precio: 1850, consumidores: ['T', 'S'], shared: true },
      { nombre: 'Milanesas de ternera', qty: 1, unit: 'kg', precio: 8400, consumidores: ['T', 'S'], shared: true },
      { nombre: 'Yogur natural', qty: 4, unit: 'un', precio: 920, consumidores: ['T'], shared: false },
      { nombre: 'Aceite girasol 1.5L', qty: 1, unit: 'un', precio: 2200, consumidores: ['T', 'S'], shared: true },
    ],
    total: 18470,
    estado: 'confirmada'
  },
  {
    id: 2,
    fecha: '02/06/2026',
    comercio: 'Coto',
    quien: 'S',
    items: [
      { nombre: 'Arroz largo fino 1kg', qty: 2, unit: 'un', precio: 1400, consumidores: ['T', 'S'], shared: true },
      { nombre: 'Fideos spaghetti 500g', qty: 3, unit: 'un', precio: 950, consumidores: ['T', 'S'], shared: true },
      { nombre: 'Champú (S)', qty: 1, unit: 'un', precio: 3200, consumidores: ['S'], shared: false },
      { nombre: 'Tomate perita lata', qty: 4, unit: 'un', precio: 780, consumidores: ['T', 'S'], shared: true },
    ],
    total: 14480,
    estado: 'confirmada'
  },
  {
    id: 3,
    fecha: '28/05/2026',
    comercio: 'Día',
    quien: 'T',
    items: [
      { nombre: 'Banana 1kg', qty: 2, unit: 'kg', precio: 1200, consumidores: ['T', 'S'], shared: true },
      { nombre: 'Manzana 1kg', qty: 1, unit: 'kg', precio: 1800, consumidores: ['T', 'S'], shared: true },
      { nombre: 'Proteína whey (T)', qty: 1, unit: 'un', precio: 12000, consumidores: ['T'], shared: false },
    ],
    total: 16200,
    estado: 'confirmada'
  },
  {
    id: 4,
    fecha: '20/05/2026',
    comercio: 'Jumbo',
    quien: 'S',
    items: [
      { nombre: 'Queso cremoso 250g', qty: 2, unit: 'un', precio: 2100, consumidores: ['T', 'S'], shared: true },
      { nombre: 'Manteca 200g', qty: 1, unit: 'un', precio: 1450, consumidores: ['T', 'S'], shared: true },
      { nombre: 'Mermelada frutilla', qty: 1, unit: 'un', precio: 1200, consumidores: ['S'], shared: false },
    ],
    total: 7850,
    estado: 'confirmada'
  },
  {
    id: 5,
    fecha: '10/05/2026',
    comercio: 'Carrefour',
    quien: 'T',
    items: [
      { nombre: 'Detergente 750ml', qty: 2, unit: 'un', precio: 980, consumidores: ['T', 'S'], shared: true },
      { nombre: 'Esponjas x3', qty: 1, unit: 'un', precio: 650, consumidores: ['T', 'S'], shared: true },
    ],
    total: 2610,
    estado: 'pendiente'
  },
  {
    id: 6,
    fecha: '15/06/2026',
    comercio: 'Jumbo',
    quien: 'S',
    items: [
      { nombre: 'Cerveza Rubia 1L', qty: 6, unit: 'un', precio: 2100, consumidores: ['T', 'S'], shared: true },
      { nombre: 'Gaseosa Cola 2.25L', qty: 2, unit: 'un', precio: 3100, consumidores: ['T', 'S'], shared: true },
      { nombre: 'Vino Malbec 750ml', qty: 1, unit: 'un', precio: 4800, consumidores: ['S'], shared: false },
      { nombre: 'Papas Fritas 250g', qty: 3, unit: 'un', precio: 1950, consumidores: ['T', 'S'], shared: true },
    ],
    total: 30150,
    estado: 'confirmada'
  },
  {
    id: 7,
    fecha: '20/06/2026',
    comercio: 'ChangoMás',
    quien: 'T',
    items: [
      { nombre: 'Leche Descremada 1L', qty: 4, unit: 'un', precio: 1550, consumidores: ['T', 'S'], shared: true },
      { nombre: 'Detergente 500ml', qty: 1, unit: 'un', precio: 1250, consumidores: ['T', 'S'], shared: true },
      { nombre: 'Lavandina 2L', qty: 1, unit: 'un', precio: 1100, consumidores: ['T', 'S'], shared: true },
      { nombre: 'Queso Rallado 120g', qty: 2, unit: 'un', precio: 980, consumidores: ['T'], shared: false },
    ],
    total: 11470,
    estado: 'confirmada'
  }
];

const INITIAL_PRODUCTS = [
  { id: 1, nombre: 'Leche entera 1L', cat: 'lácteos', unit: 'unidades', stock: 2, minStock: 3, consumidores: ['T', 'S'] },
  { id: 2, nombre: 'Milanesas de ternera', cat: 'carnes', unit: 'kg', stock: 0.5, minStock: 1, consumidores: ['T', 'S'] },
  { id: 3, nombre: 'Arroz largo fino 1kg', cat: 'despensa', unit: 'unidades', stock: 2, minStock: 0.5, consumidores: ['T', 'S'] },
  { id: 4, nombre: 'Fideos spaghetti 500g', cat: 'despensa', unit: 'unidades', stock: 3, minStock: 1, consumidores: ['T', 'S'] },
  { id: 5, nombre: 'Aceite girasol 1.5L', cat: 'despensa', unit: 'unidades', stock: 1, minStock: 1, consumidores: ['T', 'S'] },
  { id: 6, nombre: 'Yogur natural', cat: 'lácteos', unit: 'unidades', stock: 4, minStock: 2, consumidores: ['T'] },
  { id: 7, nombre: 'Banana 1kg', cat: 'verduras', unit: 'kg', stock: 1.5, minStock: 1, consumidores: ['T', 'S'] },
  { id: 8, nombre: 'Manzana 1kg', cat: 'verduras', unit: 'kg', stock: 0.3, minStock: 1, consumidores: ['T', 'S'] },
  { id: 9, nombre: 'Queso cremoso 250g', cat: 'lácteos', unit: 'unidades', stock: 1, minStock: 1, consumidores: ['T', 'S'] },
  { id: 10, nombre: 'Manteca 200g', cat: 'lácteos', unit: 'unidades', stock: 1, minStock: 1, consumidores: ['T', 'S'] },
  { id: 11, nombre: 'Tomate perita lata', cat: 'despensa', unit: 'unidades', stock: 4, minStock: 2, consumidores: ['T', 'S'] },
  { id: 12, nombre: 'Proteína whey (T)', cat: 'despensa', unit: 'unidades', stock: 1, minStock: 1, consumidores: ['T'] },
  { id: 13, nombre: 'Cerveza Rubia 1L', cat: 'bebidas', unit: 'unidades', stock: 4, minStock: 3, consumidores: ['T', 'S'] },
  { id: 14, nombre: 'Gaseosa Cola 2.25L', cat: 'bebidas', unit: 'unidades', stock: 1, minStock: 2, consumidores: ['T', 'S'] },
  { id: 15, nombre: 'Vino Malbec 750ml', cat: 'bebidas', unit: 'unidades', stock: 2, minStock: 1, consumidores: ['S'] },
  { id: 16, nombre: 'Agua Mineral 2L', cat: 'bebidas', unit: 'unidades', stock: 3, minStock: 2, consumidores: ['T', 'S'] },
  { id: 17, nombre: 'Detergente 500ml', cat: 'limpieza', unit: 'unidades', stock: 1, minStock: 1, consumidores: ['T', 'S'] },
  { id: 18, nombre: 'Lavandina 2L', cat: 'limpieza', unit: 'unidades', stock: 2, minStock: 1, consumidores: ['T', 'S'] }
];

const INITIAL_NOTIFICATIONS = [
  { id: 1, tipo: 'stock', icon: '⚠️', titulo: 'Stock bajo: Milanesas', msg: 'Quedan 0.5 kg. El mínimo configurado es 1 kg.', time: 'Hace 2 horas', leida: false },
  { id: 2, tipo: 'stock', icon: '⚠️', titulo: 'Stock bajo: Leche entera', msg: 'Quedan 2 unidades. El mínimo configurado es 3.', time: 'Hace 3 horas', leida: false },
  { id: 3, tipo: 'compra', icon: '🛒', titulo: 'Nueva compra cargada', msg: 'Tomas cargó una compra de $18.470 en Carrefour.', time: 'Hace 5 horas', leida: false },
  { id: 4, tipo: 'deuda', icon: '💰', titulo: 'Deuda pendiente', msg: 'Tu hermana tiene $4.275 pendientes desde hace 8 días.', time: 'Ayer', leida: true },
  { id: 5, tipo: 'compra', icon: '🛒', titulo: 'Nueva compra cargada', msg: 'Tu hermana cargó una compra de $14.480 en Coto.', time: 'Hace 4 días', leida: true },
  { id: 6, tipo: 'stock', icon: '⚠️', titulo: 'Stock bajo: Gaseosa Cola', msg: 'Queda 1 unidad. El mínimo configurado es 2.', time: 'Hace 1 hora', leida: false },
  { id: 7, tipo: 'compra', icon: '🛒', titulo: 'Compra de Jumbo pendiente', msg: 'Compartite una compra de $30.150 en Jumbo el 15/06.', time: 'Hace 2 días', leida: false }
];

// Datos del ticket Carrefour simulados (con descuento del 15% de Mercado Pago prorrateado)
export const CARREFOUR_RECEIPT_ITEMS = [
  { nombre: 'Rapiditas Clásicas Bimbo 275g', qty: 2, unit: 'un', precio: 1717 },
  { nombre: 'Fideos Tallarines Don Vicente', qty: 1, unit: 'un', precio: 3064 },
  { nombre: 'Salsa Filetto Arcor Doypack', qty: 1, unit: 'un', precio: 1172 },
  { nombre: 'Puré de Papas Carrefour 100g', qty: 1, unit: 'un', precio: 1012 },
  { nombre: 'Fideos Ramen Carne Arcor', qty: 1, unit: 'un', precio: 1359 },
  { nombre: 'Medallones Carne Vacuna x2', qty: 1, unit: 'un', precio: 1832 },
  { nombre: 'Lavavajilla Limón Carrefour', qty: 1, unit: 'un', precio: 1658 },
  { nombre: 'Acondicionador Balance Sedal', qty: 1, unit: 'un', precio: 1412 },
  { nombre: 'Shampoo Balance Sedal 340cc', qty: 1, unit: 'un', precio: 4751 },
  { nombre: 'Jabón Tocador Blanco Dove', qty: 1, unit: 'un', precio: 2138 },
  { nombre: 'Sorrentinos Ricota Jamón Bulnes', qty: 1, unit: 'un', precio: 3477 }
];

export const COTO_RECEIPT_ITEMS = [
  { nombre: 'Arroz Largo Fino 1kg', qty: 2, unit: 'un', precio: 2250 },
  { nombre: 'Fideos Spaghetti 500g', qty: 3, unit: 'un', precio: 1150 },
  { nombre: 'Tomate Perita Lata 400g', qty: 4, unit: 'un', precio: 980 },
  { nombre: 'Coca Cola 2.25L', qty: 2, unit: 'un', precio: 3200 },
  { nombre: 'Pan Lactal 720g', qty: 1, unit: 'un', precio: 2850 },
  { nombre: 'Queso Cremoso 250g', qty: 2, unit: 'un', precio: 3100 },
  { nombre: 'Dulce de Leche 400g', qty: 1, unit: 'un', precio: 2500 },
  { nombre: 'Galletitas Variedad x3', qty: 1, unit: 'un', precio: 1800 },
  { nombre: 'Agua Mineral 2L', qty: 3, unit: 'un', precio: 850 }
];

export const DIA_RECEIPT_ITEMS = [
  { nombre: 'Leche Entera 1L', qty: 3, unit: 'un', precio: 1650 },
  { nombre: 'Yogur Bebible Frutilla', qty: 4, unit: 'un', precio: 750 },
  { nombre: 'Huevos Blancos x12', qty: 1, unit: 'un', precio: 3800 },
  { nombre: 'Harina 0000 1kg', qty: 1, unit: 'un', precio: 1200 },
  { nombre: 'Aceite Girasol 1.5L', qty: 1, unit: 'un', precio: 2900 },
  { nombre: 'Azúcar 1kg', qty: 2, unit: 'un', precio: 1400 },
  { nombre: 'Sal Fina 500g', qty: 1, unit: 'un', precio: 450 },
  { nombre: 'Café Molido 250g', qty: 1, unit: 'un', precio: 3200 },
  { nombre: 'Té en Hebras x25', qty: 1, unit: 'un', precio: 1100 },
  { nombre: 'Agua Mineral 2L', qty: 2, unit: 'un', precio: 900 },
  { nombre: 'Jugo Naranja 1L', qty: 1, unit: 'un', precio: 1400 }
];

export const JUMBO_RECEIPT_ITEMS = [
  { nombre: 'Cerveza Rubia 1L', qty: 6, unit: 'un', precio: 2100 },
  { nombre: 'Vino Malbec 750ml', qty: 2, unit: 'un', precio: 4800 },
  { nombre: 'Gaseosa Cola 2.25L', qty: 3, unit: 'un', precio: 3100 },
  { nombre: 'Papas Fritas 250g', qty: 2, unit: 'un', precio: 1950 },
  { nombre: 'Maní Salado 150g', qty: 1, unit: 'un', precio: 850 },
  { nombre: 'Carne Vacuna Picada 1kg', qty: 1, unit: 'kg', precio: 7200 },
  { nombre: 'Pollo Entero 2.5kg', qty: 1, unit: 'un', precio: 8500 },
  { nombre: 'Helado 1Kg', qty: 1, unit: 'un', precio: 6500 },
  { nombre: 'Shampoo Sedal 340cc', qty: 1, unit: 'un', precio: 3200 },
  { nombre: 'Jabón Líquido 500ml', qty: 2, unit: 'un', precio: 1350 }
];

export const CHANGOMAS_RECEIPT_ITEMS = [
  { nombre: 'Leche Descremada 1L', qty: 6, unit: 'un', precio: 1550 },
  { nombre: 'Queso Rallado 120g', qty: 2, unit: 'un', precio: 980 },
  { nombre: 'Fideos Mostachol 500g', qty: 4, unit: 'un', precio: 1050 },
  { nombre: 'Salsa Pomarola 350g', qty: 3, unit: 'un', precio: 850 },
  { nombre: 'Detergente 500ml', qty: 2, unit: 'un', precio: 1250 },
  { nombre: 'Lavandina 2L', qty: 1, unit: 'un', precio: 1100 },
  { nombre: 'Esponja Multiuso x5', qty: 1, unit: 'un', precio: 780 },
  { nombre: 'Rollos Cocina x3', qty: 2, unit: 'un', precio: 1650 },
  { nombre: 'Servilletas x200', qty: 1, unit: 'un', precio: 1200 }
];

// Isomorphic storage fallback for Node.js / SSR testing
const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
const storageMock = {
  store: {},
  getItem(key) { return this.store[key] || null; },
  setItem(key, val) { this.store[key] = val.toString(); },
  removeItem(key) { delete this.store[key]; },
  clear() { this.store = {}; }
};
const storage = isBrowser ? window.localStorage : storageMock;

class MockDb {
  constructor() {
    this._purchaseListeners = [];
    this._productListeners = [];
    this._notificationListeners = [];
    this.initLocalStorage();
  }

  initLocalStorage() {
    if (!storage.getItem('alacena_purchases')) {
      storage.setItem('alacena_purchases', JSON.stringify(INITIAL_PURCHASES));
    }
    if (!storage.getItem('alacena_products')) {
      storage.setItem('alacena_products', JSON.stringify(INITIAL_PRODUCTS));
    }
    if (!storage.getItem('alacena_notifications')) {
      storage.setItem('alacena_notifications', JSON.stringify(INITIAL_NOTIFICATIONS));
    }
  }

  // --- GETTERS ---
  getPurchases() {
    return JSON.parse(storage.getItem('alacena_purchases'));
  }

  getProducts() {
    const list = JSON.parse(storage.getItem('alacena_products')) || [];
    return list.filter(p => !p._deleted);
  }

  getNotifications() {
    return JSON.parse(storage.getItem('alacena_notifications'));
  }

  // --- SUBSCRIPCIONES REACTIVAS ---
  subscribeToPurchases(callback) {
    callback(this.getPurchases());
    this._purchaseListeners.push(callback);
    return () => {
      this._purchaseListeners = this._purchaseListeners.filter(cb => cb !== callback);
    };
  }

  subscribeToProducts(callback) {
    callback(this.getProducts());
    this._productListeners.push(callback);
    return () => {
      this._productListeners = this._productListeners.filter(cb => cb !== callback);
    };
  }

  subscribeToNotifications(callback) {
    callback(this.getNotifications());
    this._notificationListeners.push(callback);
    return () => {
      this._notificationListeners = this._notificationListeners.filter(cb => cb !== callback);
    };
  }

  // --- MUTACIONES ---
  savePurchases(data) {
    storage.setItem('alacena_purchases', JSON.stringify(data));
    this._purchaseListeners.forEach(cb => { try { cb(data); } catch(e) {} });
  }

  saveProducts(data) {
    storage.setItem('alacena_products', JSON.stringify(data));
    this._productListeners.forEach(cb => { try { cb(data); } catch(e) {} });
    this.checkStockAlerts();
  }

  saveNotifications(data) {
    storage.setItem('alacena_notifications', JSON.stringify(data));
    this._notificationListeners.forEach(cb => { try { cb(data); } catch(e) {} });
  }

  // --- COMPRAS ---
  addPurchase(purchase) {
    const list = this.getPurchases();
    const newPurchase = {
      id: Date.now(),
      fecha: new Date().toLocaleDateString('es-AR'),
      estado: 'confirmada',
      ...purchase
    };
    list.unshift(newPurchase);
    this.savePurchases(list);

    // Integrar automáticamente al stock si está confirmada
    if (newPurchase.estado === 'confirmada') {
      this.addPurchaseItemsToStock(newPurchase.items);
    }
    return newPurchase;
  }

  updatePurchase(id, data) {
    const list = this.getPurchases();
    const idx = list.findIndex(p => p.id === id);
    if (idx !== -1) {
      const wasPending = list[idx].estado === 'pendiente';
      list[idx] = { ...list[idx], ...data };
      this.savePurchases(list);

      // Si pasa de pendiente a confirmada, ingresar items al stock
      if (wasPending && data.estado === 'confirmada') {
        this.addPurchaseItemsToStock(list[idx].items);
      }
      return list[idx];
    }
    throw new Error('Compra no encontrada');
  }

  addPurchaseItemsToStock(items) {
    const products = this.getProducts();
    items.forEach(item => {
      // Buscar producto por coincidencia de nombre aproximada
      const found = products.find(p => p.nombre.toLowerCase().trim() === item.nombre.toLowerCase().trim());
      if (found) {
        found.stock = Math.round((found.stock + item.qty) * 100) / 100;
      } else {
        // Crear nuevo producto en stock si no existe
        const newId = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
        products.push({
          id: newId,
          nombre: item.nombre,
          cat: guessCategory(item.nombre),
          unit: item.unit || 'unidades',
          stock: item.qty,
          minStock: 1,
          consumidores: item.consumidores || []
        });
      }
    });
    this.saveProducts(products);
  }

  guessCategory(name) {
    return guessCategory(name);
  }

  // --- PRODUCTOS / STOCK ---
  addProduct(product) {
    const list = this.getProducts();
    const newProduct = {
      id: list.length > 0 ? Math.max(...list.map(p => p.id)) + 1 : 1,
      stock: 0,
      minStock: 1,
      ...product
    };
    list.push(newProduct);
    this.saveProducts(list);
    return newProduct;
  }

  updateProduct(id, data) {
    const list = this.getProducts();
    const idx = list.findIndex(p => p.id === id);
    if (idx === -1) throw new Error('Producto no encontrado');
    list[idx] = { ...list[idx], ...data };
    this.saveProducts(list);
    return list[idx];
  }

  deleteProduct(id) {
    const all = JSON.parse(storage.getItem('alacena_products')) || [];
    const idx = all.findIndex(p => p.id === id);
    if (idx === -1) throw new Error('Producto no encontrado');
    all[idx] = { ...all[idx], _deleted: true };
    this.saveProducts(all);
    return true;
  }

  updateProductStock(id, newStock) {
    const list = this.getProducts();
    const idx = list.findIndex(p => p.id === id);
    if (idx !== -1) {
      list[idx].stock = Math.max(0, Math.round(newStock * 100) / 100);
      this.saveProducts(list);
      return list[idx];
    }
    throw new Error('Producto no encontrado');
  }

  consumeProduct(id, amount) {
    const list = this.getProducts();
    const idx = list.findIndex(p => p.id === id);
    if (idx !== -1) {
      const p = list[idx];
      if (p.stock >= amount) {
        p.stock = Math.round((p.stock - amount) * 100) / 100;
        this.saveProducts(list);
        return p;
      } else {
        throw new Error(`Stock insuficiente de ${p.nombre}`);
      }
    }
    throw new Error('Producto no encontrado');
  }

  deletePurchase(id) {
    const list = this.getPurchases();
    const idx = list.findIndex(p => p.id === id);
    if (idx === -1) throw new Error('Compra no encontrada');
    list[idx].estado = 'anulada';
    this.savePurchases(list);
    return true;
  }

  // --- PRODUCTOS / STOCK ---
  checkStockAlerts() {
    const products = this.getProducts();
    const alerts = products.filter(p => p.stock <= p.minStock);
    let notifs = this.getNotifications();

    alerts.forEach(p => {
      // Verificar si ya existe una notificación de stock bajo no leída para este producto
      const exists = notifs.some(n => n.tipo === 'stock' && n.titulo.includes(p.nombre) && !n.leida);
      if (!exists) {
        const stockText = p.stock === 0 ? 'Agotado' : `Quedan ${p.stock} ${p.unit}`;
        notifs.unshift({
          id: Date.now() + Math.random(),
          tipo: 'stock',
          icon: '⚠️',
          titulo: `Stock bajo: ${p.nombre}`,
          msg: `${stockText}. El mínimo configurado es ${p.minStock}.`,
          time: 'Ahora mismo',
          leida: false
        });
      }
    });
    this.saveNotifications(notifs.slice(0, 30)); // Limitar a 30 notificaciones
  }

  // --- BALANCES & GASTOS ENGINE ---
  getBalances() {
    const purchases = this.getPurchases();
    
    let totalPaidT = 0;
    let totalPaidS = 0;
    let totalShouldPayT = 0;
    let totalShouldPayS = 0;
    let settlementT_to_S = 0;
    let settlementS_to_T = 0;

    purchases.forEach(p => {
      if (p.isSettlement) {
        if (p.quien === 'T') {
          settlementT_to_S += p.total;
        } else if (p.quien === 'S') {
          settlementS_to_T += p.total;
        }
      } else {
        // Sumar gastos confirmados
        if (p.estado === 'confirmada') {
          if (p.quien === 'T') totalPaidT += p.total;
          if (p.quien === 'S') totalPaidS += p.total;

          p.items.forEach(item => {
            const cost = item.precio * item.qty;
            if (item.shared) {
              totalShouldPayT += cost / 2;
              totalShouldPayS += cost / 2;
            } else {
              const hasT = item.consumidores.includes('T');
              const hasS = item.consumidores.includes('S');
              if (hasT && hasS) {
                totalShouldPayT += cost / 2;
                totalShouldPayS += cost / 2;
              } else if (hasT) {
                totalShouldPayT += cost;
              } else if (hasS) {
                totalShouldPayS += cost;
              }
            }
          });
        }
      }
    });

    // Balance neto: lo que Tomas ha pagado extra en total
    // (Tomas pagó totalPaidT. Debería pagar totalShouldPayT. El exceso es su saldo a favor.)
    // A esto le sumamos los pagos directos realizados de Tomas a Hermana (settlementT_to_S)
    // y le restamos los pagos directos de Hermana a Tomas (settlementS_to_T).
    const netBalanceT = (totalPaidT - totalShouldPayT) + (settlementT_to_S - settlementS_to_T);

    // Si netBalanceT > 0, Hermana debe a Tomas.
    // Si netBalanceT < 0, Tomas debe a Hermana.
    const fromUser = netBalanceT < 0 ? 'T' : 'S';
    const toUser = netBalanceT < 0 ? 'S' : 'T';
    const amount = Math.abs(netBalanceT);

    // Calcular estadísticas del mes (Junio 2026 en este caso, o globales para simplificar)
    // Para el MVP, usaremos la sumatoria de confirmados de Junio 2026 en el historial
    // que son las compras del mes corriente.
    return {
      net: {
        fromUser,
        toUser,
        amount: Math.round(amount * 100) / 100,
        formattedAmount: `$${Math.round(amount).toLocaleString('es-AR')}`
      },
      summary: {
        totalPaidT: Math.round(totalPaidT),
        totalPaidS: Math.round(totalPaidS),
        totalShouldPayT: Math.round(totalShouldPayT),
        totalShouldPayS: Math.round(totalShouldPayS)
      }
    };
  }

  saldarDeudas() {
    const bal = this.getBalances();
    if (bal.net.amount <= 0) return null;

    const purchases = this.getPurchases();
    const settlement = {
      id: Date.now(),
      fecha: new Date().toLocaleDateString('es-AR'),
      comercio: 'Liquidación de Deuda',
      quien: bal.net.fromUser, // El usuario deudor paga
      total: bal.net.amount,
      isSettlement: true,
      items: [
        {
          nombre: 'Liquidación de balance',
          qty: 1,
          unit: 'transacción',
          precio: bal.net.amount,
          consumidores: [bal.net.fromUser],
          shared: false
        }
      ],
      estado: 'confirmada'
    };

    purchases.unshift(settlement);
    this.savePurchases(purchases);

    // Notificación de deuda saldada
    const notifs = this.getNotifications();
    notifs.unshift({
      id: Date.now() + Math.random(),
      tipo: 'deuda',
      icon: '💰',
      titulo: 'Deuda liquidada',
      msg: `Se saldó la deuda de $${Math.round(bal.net.amount).toLocaleString('es-AR')}.`,
      time: 'Ahora mismo',
      leida: false
    });
    this.saveNotifications(notifs);

    return settlement;
  }

  savePushSubscription(houseId, userId, subscription) {
    storage.setItem(`alacena_push_${userId}`, JSON.stringify(subscription));
  }

  // --- NOTIFICACIONES ---
  markNotificationsRead() {
    const notifs = this.getNotifications();
    notifs.forEach(n => n.leida = true);
    this.saveNotifications(notifs);
  }
}

export const mockDb = new MockDb();
