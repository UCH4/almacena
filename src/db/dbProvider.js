import { mockDb } from './mockDb';
import { firebaseDb } from './firebaseDb';
import { isConfigured, isInitialized } from './firebase';

class DbProvider {
  constructor() {
    this.useFirebase = isConfigured && isInitialized;
    if (this.useFirebase) {
      this.db = firebaseDb;
      console.log('AlacenaApp DB: Conectado a Cloud Firestore.');
    } else {
      this.db = mockDb;
      console.log('AlacenaApp DB: Modo local persistente (localStorage).');
    }
  }

  setCurrentUser(user) {
    if (this.useFirebase) {
      this.db.setCurrentUser(user);
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

  async createHouse(userId, houseName, userName, userPhoto, userEmoji) {
    if (this.useFirebase) return this.db.createHouse(userId, houseName, userName, userPhoto, userEmoji);
    return null;
  }

  async joinHouse(userId, inviteCode, userName, userPhoto, userEmoji) {
    if (this.useFirebase) return this.db.joinHouse(userId, inviteCode, userName, userPhoto, userEmoji);
    return null;
  }

  async updateHouseCategories(houseId, categories) {
    if (this.useFirebase) return this.db.updateHouseCategories(houseId, categories);
  }

  async updateMemberInfo(houseId, userId, data) {
    if (this.useFirebase) return this.db.updateMemberInfo(houseId, userId, data);
  }

  async leaveHouse(houseId, userId, userName) {
    if (this.useFirebase) return this.db.leaveHouse(houseId, userId, userName);
    return { left: true, remainingMembers: [], activeHouseId: null };
  }

  async getUserHouses(userId) {
    if (this.useFirebase) return this.db.getUserHouses(userId);
    return [{ id: 'local_house', name: 'Casa Tomas (Local)', members: ['T', 'S'], membersInfo: { 'T': { name: 'Tomas' }, 'S': { name: 'Hermana' } } }];
  }

  async switchHouse(userId, houseId) {
    if (this.useFirebase) return this.db.switchHouse(userId, houseId);
    return this.getHouse(houseId);
  }

  async updateHouseSheetUrl(houseId, sheetUrl) {
    if (this.useFirebase) return this.db.updateHouseSheetUrl(houseId, sheetUrl);
  }

  async updateHouseWebhookUrl(houseId, webhookUrl) {
    if (this.useFirebase) return this.db.updateHouseWebhookUrl(houseId, webhookUrl);
  }

  async syncToWebhook(houseId, data) {
    if (this.useFirebase) return this.db.syncToWebhook(houseId, data);
  }

  async saveMealPlan(houseId, mealPlan) {
    if (this.useFirebase) return this.db.saveMealPlan(houseId, mealPlan);
  }

  // --- LISTENERS EN TIEMPO REAL ---
  subscribeToHouse(houseId, callback) {
    if (this.useFirebase) return this.db.subscribeToHouse(houseId, callback);
    return () => {};
  }

  subscribeToPurchases(houseId, callback) {
    if (this.useFirebase) return this.db.subscribeToPurchases(houseId, callback);
    return this.db.subscribeToPurchases(callback);
  }

  subscribeToProducts(houseId, callback) {
    if (this.useFirebase) return this.db.subscribeToProducts(houseId, callback);
    return this.db.subscribeToProducts(callback);
  }

  subscribeToNotifications(houseId, callback) {
    if (this.useFirebase) return this.db.subscribeToNotifications(houseId, callback);
    return this.db.subscribeToNotifications(callback);
  }

  subscribeToAuditLog(houseId, callback) {
    if (this.useFirebase) return this.db.subscribeToAuditLog(houseId, callback);
    callback([]);
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

  async deletePurchase(houseId, id) {
    if (this.useFirebase) return this.db.deletePurchase(houseId, id);
    return this.db.deletePurchase(id);
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

  async updateProduct(houseId, id, data) {
    if (this.useFirebase) return this.db.updateProduct(houseId, id, data);
    return this.db.updateProduct(id, data);
  }

  async deleteProduct(houseId, id) {
    if (this.useFirebase) return this.db.deleteProduct(houseId, id);
    return this.db.deleteProduct(id);
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

  async savePushSubscription(houseId, userId, subscription) {
    if (this.useFirebase) return this.db.savePushSubscription(houseId, userId, subscription);
    return this.db.savePushSubscription(houseId, userId, subscription);
  }

  // --- NOTIFICACIONES ---
  async markNotificationsRead(houseId, notificationsList) {
    if (this.useFirebase) return this.db.markNotificationsRead(houseId, notificationsList);
    return this.db.markNotificationsRead();
  }
}

export const dbProvider = new DbProvider();
export const isFirebaseActive = isConfigured && isInitialized;
