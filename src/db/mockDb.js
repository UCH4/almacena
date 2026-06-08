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
  { id: 12, nombre: 'Proteína whey (T)', cat: 'despensa', unit: 'unidades', stock: 1, minStock: 1, consumidores: ['T'] }
];

const INITIAL_NOTIFICATIONS = [
  { id: 1, tipo: 'stock', icon: '⚠️', titulo: 'Stock bajo: Milanesas', msg: 'Quedan 0.5 kg. El mínimo configurado es 1 kg.', time: 'Hace 2 horas', leida: false },
  { id: 2, tipo: 'stock', icon: '⚠️', titulo: 'Stock bajo: Leche entera', msg: 'Quedan 2 unidades. El mínimo configurado es 3.', time: 'Hace 3 horas', leida: false },
  { id: 3, tipo: 'compra', icon: '🛒', titulo: 'Nueva compra cargada', msg: 'Tomas cargó una compra de $18.470 en Carrefour.', time: 'Hace 5 horas', leida: false },
  { id: 4, tipo: 'deuda', icon: '💰', titulo: 'Deuda pendiente', msg: 'Tu hermana tiene $4.275 pendientes desde hace 8 días.', time: 'Ayer', leida: true },
  { id: 5, tipo: 'compra', icon: '🛒', titulo: 'Nueva compra cargada', msg: 'Tu hermana cargó una compra de $14.480 en Coto.', time: 'Hace 4 días', leida: true }
];

// Datos del ticket Carrefour simulados (con descuento del 15% de Mercado Pago prorrateado)
export const CARREFOUR_RECEIPT_ITEMS = [
  { nombre: 'Rapiditas Clásicas Bimbo 275g', qty: 2, unit: 'un', precio: 1717 }, // (8078 - 4039) * 0.85 = 3433.15 / 2 = 1716.5 -> 1717
  { nombre: 'Fideos Tallarines Don Vicente', qty: 1, unit: 'un', precio: 3064 }, // 3605 * 0.85 = 3064.25
  { nombre: 'Salsa Filetto Arcor Doypack', qty: 1, unit: 'un', precio: 1172 }, // 1379 * 0.85 = 1172.15
  { nombre: 'Puré de Papas Carrefour 100g', qty: 1, unit: 'un', precio: 1012 }, // 1190 * 0.85 = 1011.5
  { nombre: 'Fideos Ramen Carne Arcor', qty: 1, unit: 'un', precio: 1359 }, // 1599 * 0.85 = 1359.15
  { nombre: 'Medallones Carne Vacuna x2', qty: 1, unit: 'un', precio: 1832 }, // 2155 * 0.85 = 1831.75
  { nombre: 'Lavavajilla Limón Carrefour', qty: 1, unit: 'un', precio: 1658 }, // (2050 - 100) * 0.85 = 1657.5
  { nombre: 'Acondicionador Balance Sedal', qty: 1, unit: 'un', precio: 1412 }, // (5539 - 3877.3) * 0.85 = 1412.4
  { nombre: 'Shampoo Balance Sedal 340cc', qty: 1, unit: 'un', precio: 4751 }, // 5589 * 0.85 = 4750.65
  { nombre: 'Jabón Tocador Blanco Dove', qty: 1, unit: 'un', precio: 2138 }, // 2515 * 0.85 = 2137.75
  { nombre: 'Sorrentinos Ricota Jamón Bulnes', qty: 1, unit: 'un', precio: 3477 } // 4090 * 0.85 = 3476.5
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
    return JSON.parse(storage.getItem('alacena_products'));
  }

  getNotifications() {
    return JSON.parse(storage.getItem('alacena_notifications'));
  }

  // --- MUTACIONES ---
  savePurchases(data) {
    storage.setItem('alacena_purchases', JSON.stringify(data));
  }

  saveProducts(data) {
    storage.setItem('alacena_products', JSON.stringify(data));
    this.checkStockAlerts();
  }

  saveNotifications(data) {
    storage.setItem('alacena_notifications', JSON.stringify(data));
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
          cat: this.guessCategory(item.nombre),
          unit: item.unit || 'unidades',
          stock: item.qty,
          minStock: 1,
          consumidores: item.consumidores || ['T', 'S']
        });
      }
    });
    this.saveProducts(products);
  }

  guessCategory(name) {
    const n = name.toLowerCase();
    if (n.includes('leche') || n.includes('yogur') || n.includes('queso') || n.includes('manteca') || n.includes('crema')) return 'lácteos';
    if (n.includes('carne') || n.includes('milanesa') || n.includes('pollo') || n.includes('medallon')) return 'carnes';
    if (n.includes('banana') || n.includes('manzana') || n.includes('tomate') || n.includes('papa') || n.includes('verdura')) return 'verduras';
    if (n.includes('fideo') || n.includes('arroz') || n.includes('aceite') || n.includes('salsa') || n.includes('harina') || n.includes('lata') || n.includes('proteína') || n.includes('whey')) return 'despensa';
    if (n.includes('detergente') || n.includes('esponja') || n.includes('limón') || n.includes('lavavajilla') || n.includes('limpieza')) return 'limpieza';
    if (n.includes('shampoo') || n.includes('acondicionador') || n.includes('jabón') || n.includes('dove') || n.includes('sedal')) return 'perfumería';
    return 'despensa';
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

  // --- ALERTAS DE STOCK BAJO ---
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
          nombre: `Pago de deuda neto (${bal.net.fromUser === 'S' ? 'Hermana' : 'Tomas'} -> ${bal.net.toUser === 'S' ? 'Hermana' : 'Tomas'})`,
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
      msg: `${bal.net.fromUser === 'S' ? 'Hermana' : 'Tomas'} saldó la deuda de $${Math.round(bal.net.amount).toLocaleString('es-AR')}.`,
      time: 'Ahora mismo',
      leida: false
    });
    this.saveNotifications(notifs);

    return settlement;
  }

  // --- NOTIFICACIONES ---
  markNotificationsRead() {
    const notifs = this.getNotifications();
    notifs.forEach(n => n.leida = true);
    this.saveNotifications(notifs);
  }
}

export const mockDb = new MockDb();
