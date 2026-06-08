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
    if (this.useFirebase) return this.db.addPurchase(houseId, purchase);
    return this.db.addPurchase(purchase);
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
