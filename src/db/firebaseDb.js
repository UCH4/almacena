import { doc, getDoc, updateDoc, getDocs, query, collection, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { localCache } from './localCache';

import {
  getHouse, getUserHouses, switchHouse, createHouse, joinHouse,
  updateHouseCategories, updateMemberInfo, leaveHouse,
  updateHouseSheetUrl, updateHouseWebhookUrl, syncToWebhook,
  subscribeToHouse
} from './repos/house';
import {
  getUserProfile, saveUserProfile
} from './repos/profile';
import {
  subscribeToPurchases, addPurchase, updatePurchase, deletePurchase,
  saldarDeudas, getBalances
} from './repos/purchase';
import {
  subscribeToProducts, consumeProduct, consumeMultipleProducts,
  addProduct, updateProduct, deleteProduct
} from './repos/product';
import {
  subscribeToNotifications, subscribeToAuditLog,
  markNotificationsRead, savePushSubscription, saveMealPlan,
  checkAndCreateStockAlert
} from './repos/notification';

class FirebaseDb {
  constructor() {
    this.currentUser = null;
  }

  setCurrentUser(user) {
    this.currentUser = user;
  }

  _userMeta() {
    const u = this.currentUser;
    return u ? { uid: u.uid, displayName: u.displayName || u.email || "Usuario" } : null;
  }

  // --- PERFILES ---
  getUserProfile(userId) { return getUserProfile(userId); }
  saveUserProfile(userId, data) { return saveUserProfile(userId, data); }

  // --- CASAS ---
  getHouse(houseId) { return getHouse(houseId); }
  getUserHouses(userId) { return getUserHouses(userId); }
  switchHouse(userId, houseId) { return switchHouse(userId, houseId); }
  createHouse(userId, houseName, userName, userPhoto, userEmoji) {
    return createHouse(userId, houseName, userName, userPhoto, userEmoji);
  }
  joinHouse(userId, inviteCode, userName, userPhoto, userEmoji) {
    return joinHouse(userId, inviteCode, userName, userPhoto, userEmoji);
  }
  updateHouseCategories(houseId, categories) {
    return updateHouseCategories(houseId, categories);
  }
  updateMemberInfo(houseId, userId, data) {
    return updateMemberInfo(houseId, userId, data);
  }
  leaveHouse(houseId, userId, userName) {
    return leaveHouse(houseId, userId, userName);
  }
  updateHouseSheetUrl(houseId, sheetUrl) {
    return updateHouseSheetUrl(houseId, sheetUrl);
  }
  updateHouseWebhookUrl(houseId, webhookUrl) {
    return updateHouseWebhookUrl(houseId, webhookUrl);
  }
  syncToWebhook(houseId, data) { return syncToWebhook(houseId, data); }

  // --- SUBSCRIPTIONS ---
  subscribeToHouse(houseId, callback) {
    return subscribeToHouse(houseId, (data) => {
      localCache.setAll('house', [data]);
      callback(data);
    });
  }

  subscribeToPurchases(houseId, callback) {
    return subscribeToPurchases(houseId, (list) => {
      localCache.setAll('purchases', list);
      callback(list);
    });
  }

  subscribeToProducts(houseId, callback) {
    return subscribeToProducts(houseId, (list) => {
      localCache.setAll('products', list);
      callback(list);
    });
  }

  subscribeToNotifications(houseId, callback) {
    return subscribeToNotifications(houseId, callback);
  }

  subscribeToAuditLog(houseId, callback) {
    return subscribeToAuditLog(houseId, callback);
  }

  // --- COMPRAS ---
  addPurchase(houseId, purchase) {
    return addPurchase(houseId, purchase, this._userMeta());
  }
  updatePurchase(houseId, purchaseId, data) {
    return updatePurchase(houseId, purchaseId, data, this._userMeta());
  }
  deletePurchase(houseId, purchaseId) {
    return deletePurchase(houseId, purchaseId, this._userMeta());
  }
  saldarDeudas(houseId, balance, payerUid, receiverUid, payerName, receiverName) {
    return saldarDeudas(houseId, balance, payerUid, receiverUid, payerName, receiverName, this._userMeta());
  }
  getBalances(houseId) { return getBalances(houseId); }

  // --- PRODUCTOS ---
  consumeProduct(houseId, productId, amount) {
    return consumeProduct(houseId, productId, amount, this._userMeta());
  }
  consumeMultipleProducts(houseId, consumptions) {
    return consumeMultipleProducts(houseId, consumptions, this._userMeta());
  }
  addProduct(houseId, product) {
    return addProduct(houseId, product, this._userMeta());
  }
  updateProduct(houseId, productId, data) {
    return updateProduct(houseId, productId, data, this._userMeta());
  }
  deleteProduct(houseId, productId) {
    return deleteProduct(houseId, productId, this._userMeta());
  }

  // --- NOTIFICACIONES ---
  markNotificationsRead(houseId, notifications) {
    return markNotificationsRead(houseId, notifications, this._userMeta());
  }
  savePushSubscription(houseId, userId, subscription) {
    return savePushSubscription(houseId, userId, subscription);
  }
  saveMealPlan(houseId, mealPlan) {
    return saveMealPlan(houseId, mealPlan);
  }
  checkAndCreateStockAlert(houseId, productId) {
    return checkAndCreateStockAlert(houseId, productId);
  }
}

export const firebaseDb = new FirebaseDb();
