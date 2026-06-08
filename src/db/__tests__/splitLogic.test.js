// --- MOCK LOCALSTORAGE FOR NODE ENVIRONMENT ---
global.localStorage = {
  store: {},
  getItem(key) {
    return this.store[key] || null;
  },
  setItem(key, value) {
    this.store[key] = value.toString();
  },
  removeItem(key) {
    delete this.store[key];
  },
  clear() {
    this.store = {};
  }
};

// Importar mockDb después de configurar el mock global
import { mockDb } from '../mockDb.js';

function runTests() {
  console.log('🧪 Iniciando pruebas unitarias del motor de cálculo de deudas...');

  try {
    // 1. Resetear localStorage
    localStorage.clear();
    mockDb.initLocalStorage();

    // 2. Comprobar datos semilla iniciales
    const initialBalances = mockDb.getBalances();
    console.assert(
      initialBalances.net.fromUser === 'S', 
      'Prueba 1 Falló: El deudor inicial debería ser Hermana ("S")'
    );
    console.assert(
      initialBalances.net.toUser === 'T', 
      'Prueba 1 Falló: El acreedor inicial debería ser Tomas ("T")'
    );
    console.log('✅ Prueba 1: Datos semilla cargados correctamente.');

    // 3. Limpiar base de datos para pruebas controladas
    mockDb.savePurchases([]);
    mockDb.saveProducts([]);

    // 4. Agregar compra compartida (Tomas paga 1000 ARS por un ítem de 600 compartido y uno de 400 exclusivo de él)
    mockDb.addPurchase({
      fecha: '01/06/2026',
      comercio: 'Supermercado A',
      quien: 'T',
      items: [
        { nombre: 'Fideos Compartidos', qty: 1, unit: 'un', precio: 600, consumidores: ['T', 'S'], shared: true },
        { nombre: 'Chocolate Tomas', qty: 1, unit: 'un', precio: 400, consumidores: ['T'], shared: false }
      ],
      total: 1000,
      estado: 'confirmada'
    });

    // Cálculos esperados:
    // Tomas pagó: 1000
    // Tomas consumió: 300 (fideos) + 400 (chocolate) = 700
    // Hermana consumió: 300 (fideos) = 300
    // Tomas debería haber pagado 700. Hermana debería haber pagado 300.
    // Hermana le debe a Tomas: 300.
    let bal = mockDb.getBalances();
    console.assert(bal.net.amount === 300, `Prueba 2 Falló: La deuda debería ser 300, se obtuvo ${bal.net.amount}`);
    console.assert(bal.net.fromUser === 'S', 'Prueba 2 Falló: Deudor debería ser S');
    console.assert(bal.net.toUser === 'T', 'Prueba 2 Falló: Acreedor debería ser T');
    console.log('✅ Prueba 2: Cálculo de compra mixta (compartido + exclusivo) exitoso.');

    // 5. Agregar compra exclusiva (Hermana paga 500 ARS por un ítem exclusivo de ella)
    mockDb.addPurchase({
      fecha: '02/06/2026',
      comercio: 'Farmacia B',
      quien: 'S',
      items: [
        { nombre: 'Champú Hermana', qty: 1, unit: 'un', precio: 500, consumidores: ['S'], shared: false }
      ],
      total: 500,
      estado: 'confirmada'
    });

    // Cálculos esperados acumulados:
    // Tomas pagó en total: 1000. Tomas debió pagar: 700.
    // Hermana pagó en total: 500. Hermana debió pagar: 300 (fideos) + 500 (champú) = 800.
    // Balance neto de Tomas: (1000 - 700) = +300.
    // Balance neto de Hermana: (500 - 800) = -300.
    // Hermana sigue debiendo 300 a Tomas.
    bal = mockDb.getBalances();
    console.assert(bal.net.amount === 300, `Prueba 3 Falló: La deuda acumulada debería ser 300, se obtuvo ${bal.net.amount}`);
    console.log('✅ Prueba 3: Acumulación de compras exclusivas sin alteración del balance neto compartida exitosa.');

    // 6. Agregar otra compra (Hermana paga 800 por un ítem compartido)
    mockDb.addPurchase({
      fecha: '03/06/2026',
      comercio: 'Verdulería C',
      quien: 'S',
      items: [
        { nombre: 'Papas Compartidas', qty: 1, unit: 'un', precio: 800, consumidores: ['T', 'S'], shared: true }
      ],
      total: 800,
      estado: 'confirmada'
    });

    // Cálculos esperados acumulados:
    // Tomas pagó: 1000. Debió pagar: 700 + 400 (mitad de papas) = 1100. (Balance Tomas: -100)
    // Hermana pagó: 500 + 800 = 1300. Debió pagar: 800 + 400 = 1200. (Balance Hermana: +100)
    // Ahora Tomas le debe 100 a Hermana.
    bal = mockDb.getBalances();
    console.assert(bal.net.amount === 100, `Prueba 4 Falló: La deuda debería ser 100, se obtuvo ${bal.net.amount}`);
    console.assert(bal.net.fromUser === 'T', 'Prueba 4 Falló: Deudor debería ser Tomas ("T")');
    console.assert(bal.net.toUser === 'S', 'Prueba 4 Falló: Acreedor debería ser Hermana ("S")');
    console.log('✅ Prueba 4: Inversión de deudor tras gasto mayor exitosa.');

    // 7. Saldar deudas (Tomas paga 100 a Hermana para liquidar cuentas)
    mockDb.saldarDeudas();
    
    // Cálculos esperados:
    // El balance neto debería ser 0
    bal = mockDb.getBalances();
    console.assert(bal.net.amount === 0, `Prueba 5 Falló: El balance debería quedar en 0, se obtuvo ${bal.net.amount}`);
    console.log('✅ Prueba 5: Liquidación / Cancelación de deudas exitosa.');

    console.log('\n🎉 ¡TODAS LAS PRUEBAS SE COMPLETARON CON ÉXITO! El motor de cálculo funciona a la perfección. 🎉');
  } catch (error) {
    console.error('❌ Error en la ejecución de pruebas:', error);
    process.exit(1);
  }
}

runTests();
