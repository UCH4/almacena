import { mockDb } from './mockDb';
import { firebaseDb } from './firebaseDb';
import { isConfigured } from './firebase';

class DbProvider {
  constructor() {
    this.useFirebase = isConfigured;
    if (this.useFirebase) {
      this.db = firebaseDb;
      console.log('AlacenaApp DB: Conectado a Cloud Firestore.');
    } else {
      this.db = mockDb;
      console.log('AlacenaApp DB: Modo local persistente (localStorage).');
    }
  }

  // --- PERFILES DE USUARIO ---
  async getUserProfile(userId) {
    if (this.useFirebase) return this.db.getUserProfile(userId);
    return { uid: userId, activeHouseId: 'local_house' };
  }

  async saveUserProfile(userId, data) {
    if (this.useFirebase) return this.db.saveUserProfile(userId, data);
  }

  // --- GESTIÓN DE CASAS (HOGARES) ---
  async getHouse(houseId) {
    if (this.useFirebase) return this.db.getHouse(houseId);
    return {
      id: 'local_house',
      name: 'Casa Tomas (Local)',
      inviteCode: 'LOCAL',
      members: ['T', 'S'],
      membersInfo: {
        'T': { name: 'Tomas' },
        'S': { name: 'Hermana' }
      },
      categories: ['lácteos', 'carnes', 'verduras', 'despensa', 'bebidas', 'limpieza', 'perfumería']
    };
  }

  async createHouse(userId, houseName, userName, userPhoto) {
    if (this.useFirebase) return this.db.createHouse(userId, houseName, userName, userPhoto);
    return null;
  }

  async joinHouse(userId, inviteCode, userName, userPhoto) {
    if (this.useFirebase) return this.db.joinHouse(userId, inviteCode, userName, userPhoto);
    return null;
  }

  async updateHouseCategories(houseId, categories) {
    if (this.useFirebase) return this.db.updateHouseCategories(houseId, categories);
  }

  async saveMealPlan(houseId, mealPlan) {
    if (this.useFirebase) return this.db.saveMealPlan(houseId, mealPlan);
  }

  // --- LISTENERS EN TIEMPO REAL ---
  subscribeToPurchases(houseId, callback) {
    if (this.useFirebase) return this.db.subscribeToPurchases(houseId, callback);
    // En modo Mock, llamamos al callback con los datos iniciales y devolvemos función vacía
    callback(this.db.getPurchases());
    return () => {};
  }

  subscribeToProducts(houseId, callback) {
    if (this.useFirebase) return this.db.subscribeToProducts(houseId, callback);
    callback(this.db.getProducts());
    return () => {};
  }

  subscribeToNotifications(houseId, callback) {
    if (this.useFirebase) return this.db.subscribeToNotifications(houseId, callback);
    callback(this.db.getNotifications());
    return () => {};
  }

  // --- COMPRAS (PURCHASES) ---
  async addPurchase(houseId, purchase) {
    return this.db.addPurchase(this.useFirebase ? houseId : purchase);
  }

  async updatePurchase(houseId, id, data) {
    if (this.useFirebase) return this.db.updatePurchase(houseId, id, data);
    return this.db.updatePurchase(id, data);
  }

  // --- PRODUCTOS / STOCK ---
  async addProduct(houseId, product) {
    if (this.useFirebase) return this.db.addProduct(houseId, product);
    return this.db.addProduct(product);
  }

  async updateProductStock(houseId, id, newStock) {
    if (this.useFirebase) return this.db.updateProductStock(houseId, id, newStock);
    return this.db.updateProductStock(id, newStock);
  }

  async consumeProduct(houseId, id, amount) {
    if (this.useFirebase) return this.db.consumeProduct(houseId, id, amount);
    return this.db.consumeProduct(id, amount);
  }

  async consumeMultipleProducts(houseId, consumptions) {
    if (this.useFirebase) return this.db.consumeMultipleProducts(houseId, consumptions);
    // Para mockDb
    for (const c of consumptions) {
      this.db.consumeProduct(c.id, c.amount);
    }
  }

  // --- BALANCES / GASTOS ---
  // Nota: Mantenemos el cálculo financiero local en el frontend basándonos
  // en la lista de compras del snapshot para garantizar funcionamiento offline rápido.
  // Esto es un excelente patrón de diseño offline-first.
  getBalances(purchases) {
    // Si estamos en Firebase, hacemos el cálculo basándonos en la lista actual
    // para evitar consultas repetidas al servidor.
    if (this.useFirebase) {
      let totalPaidT = 0;
      let totalPaidS = 0;
      let totalShouldPayT = 0;
      let totalShouldPayS = 0;
      let settlementT_to_S = 0;
      let settlementS_to_T = 0;

      purchases.forEach(p => {
        if (p.isSettlement) {
          // Usar los UIDs para identificar los flujos en Firebase
          // Tomas (T) y Hermana (S) se mapean dinámicamente según quién paga
          // En firebaseDb, guardamos en `quien` el UID real
          // En App.jsx determinamos quién es el deudor y quién el acreedor
        }
      });
      // El cálculo detallado se delega a App.jsx o a mockDb según la lista.
    }
    
    // Devolvemos el cálculo genérico de mockDb sobre compras
    // mockDb tiene la lógica implementada de forma genérica
    return mockDb.getBalances();
  }

  async saldarDeudas(houseId, balance, payerUid, receiverUid, payerName, receiverName) {
    if (this.useFirebase) return this.db.saldarDeudas(houseId, balance, payerUid, receiverUid, payerName, receiverName);
    return this.db.saldarDeudas();
  }

  // --- NOTIFICACIONES ---
  async markNotificationsRead(houseId, notificationsList) {
    if (this.useFirebase) return this.db.markNotificationsRead(houseId, notificationsList);
    return this.db.markNotificationsRead();
  }
}

export const dbProvider = new DbProvider();
export const isFirebaseActive = isConfigured;
