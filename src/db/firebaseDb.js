import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs,
  addDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot, 
  runTransaction,
  writeBatch,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';

class FirebaseDb {
  // --- GESTIÓN DE PERFILES DE USUARIO ---
  async getUserProfile(userId) {
    const docRef = doc(db, 'users', userId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() : null;
  }

  async saveUserProfile(userId, data) {
    const docRef = doc(db, 'users', userId);
    await setDoc(docRef, {
      uid: userId,
      updatedAt: serverTimestamp(),
      ...data
    }, { merge: true });
  }

  // --- GESTIÓN DE CASAS (HOGARES) ---
  async getHouse(houseId) {
    const docRef = doc(db, 'houses', houseId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() : null;
  }

  // Crear una nueva casa
  async createHouse(userId, houseName, userName, userPhoto = '') {
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase(); // Código de 6 letras/números
    const houseRef = doc(collection(db, 'houses'));
    const houseId = houseRef.id;

    const houseData = {
      id: houseId,
      name: houseName,
      inviteCode,
      owner: userId,
      members: [userId],
      membersInfo: {
        [userId]: { name: userName, photo: userPhoto }
      },
      categories: ['lácteos', 'carnes', 'verduras', 'despensa', 'bebidas', 'limpieza', 'perfumería'],
      createdAt: serverTimestamp()
    };

    await setDoc(houseRef, houseData);
    
    // Asociar al usuario a esta casa activa
    await this.saveUserProfile(userId, { activeHouseId: houseId });

    return houseData;
  }

  // Unirse a una casa existente usando el código de invitación
  async joinHouse(userId, inviteCode, userName, userPhoto = '') {
    const q = query(collection(db, 'houses'), where('inviteCode', '==', inviteCode.toUpperCase().trim()));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      throw new Error('Código de invitación inválido.');
    }

    const houseDoc = querySnapshot.docs[0];
    const houseData = houseDoc.data();
    const houseId = houseDoc.id;

    if (houseData.members.includes(userId)) {
      // Ya es miembro, solo actualizar casa activa
      await this.saveUserProfile(userId, { activeHouseId: houseId });
      return houseData;
    }

    // Agregar miembro al documento de la casa
    const houseRef = doc(db, 'houses', houseId);
    const updatedMembers = [...houseData.members, userId];
    const updatedMembersInfo = {
      ...houseData.membersInfo,
      [userId]: { name: userName, photo: userPhoto }
    };

    await updateDoc(houseRef, {
      members: updatedMembers,
      membersInfo: updatedMembersInfo
    });

    // Asociar al usuario a esta casa activa
    await this.saveUserProfile(userId, { activeHouseId: houseId });

    return { ...houseData, members: updatedMembers, membersInfo: updatedMembersInfo };
  }

  // Actualizar categorías de la casa
  async updateHouseCategories(houseId, categories) {
    const houseRef = doc(db, 'houses', houseId);
    await updateDoc(houseRef, { categories });
  }

  // --- LISTENERS EN TIEMPO REAL (SYNC) ---
  subscribeToPurchases(houseId, callback) {
    const q = query(
      collection(db, 'houses', houseId, 'purchases'), 
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(list);
    }, (error) => {
      console.error("Error subscribiéndose a compras:", error);
    });
  }

  subscribeToProducts(houseId, callback) {
    const q = query(collection(db, 'houses', houseId, 'products'));
    return onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(list);
    }, (error) => {
      console.error("Error subscribiéndose a stock:", error);
    });
  }

  subscribeToNotifications(houseId, callback) {
    const q = query(
      collection(db, 'houses', houseId, 'notifications'),
      orderBy('createdAt', 'desc'),
      limit(30)
    );
    return onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(list);
    }, (error) => {
      console.error("Error subscribiéndose a notificaciones:", error);
    });
  }

  // --- MUTACIONES DE DATOS ---
  
  // Agregar una nueva compra
  async addPurchase(houseId, purchase) {
    const batch = writeBatch(db);
    const purchaseRef = doc(collection(db, 'houses', houseId, 'purchases'));
    
    const newPurchase = {
      ...purchase,
      createdAt: serverTimestamp()
    };
    
    // Guardar compra
    batch.set(purchaseRef, newPurchase);

    // Si está confirmada, integrar ítems al stock
    if (purchase.estado === 'confirmada') {
      // Leeremos los productos actuales para actualizar stock
      const productsSnap = await getDocs(collection(db, 'houses', houseId, 'products'));
      const products = productsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      purchase.items.forEach(item => {
        const found = products.find(p => p.nombre.toLowerCase().trim() === item.nombre.toLowerCase().trim());
        if (found) {
          const productRef = doc(db, 'houses', houseId, 'products', found.id);
          batch.update(productRef, {
            stock: Math.round((found.stock + item.qty) * 100) / 100
          });
        } else {
          // Crear nuevo producto
          const newProductRef = doc(collection(db, 'houses', houseId, 'products'));
          batch.set(newProductRef, {
            nombre: item.nombre,
            cat: this.guessCategory(item.nombre),
            unit: item.unit || 'unidades',
            stock: item.qty,
            minStock: 1,
            consumidores: item.consumidores || ['T', 'S'],
            createdAt: serverTimestamp()
          });
        }
      });
    }

    await batch.commit();
  }

  // Consumir un producto
  async consumeProduct(houseId, productId, amount) {
    const productRef = doc(db, 'houses', houseId, 'products', productId);
    
    await runTransaction(db, async (transaction) => {
      const sfDoc = await transaction.get(productRef);
      if (!sfDoc.exists()) {
        throw new Error("El producto no existe.");
      }

      const newStock = Math.max(0, Math.round((sfDoc.data().stock - amount) * 100) / 100);
      transaction.update(productRef, { stock: newStock });
    });

    // Validar alertas de stock bajo después del consumo
    setTimeout(() => this.checkAndCreateStockAlert(houseId, productId), 1000);
  }

  // Consumir múltiples productos (para recetas)
  async consumeMultipleProducts(houseId, consumptions) {
    const batch = writeBatch(db);
    
    for (const c of consumptions) {
      const productRef = doc(db, 'houses', houseId, 'products', c.id);
      const sfDoc = await getDoc(productRef);
      if (sfDoc.exists()) {
        const newStock = Math.max(0, Math.round((sfDoc.data().stock - c.amount) * 100) / 100);
        batch.update(productRef, { stock: newStock });
      }
    }

    await batch.commit();

    // Validar alertas de stock
    consumptions.forEach(c => {
      setTimeout(() => this.checkAndCreateStockAlert(houseId, c.id), 1000);
    });
  }

  // Validar y gatillar alertas de stock bajo
  async checkAndCreateStockAlert(houseId, productId) {
    const productRef = doc(db, 'houses', houseId, 'products', productId);
    const pSnap = await getDoc(productRef);
    if (!pSnap.exists()) return;
    const p = pSnap.data();

    if (p.stock <= p.minStock) {
      // Buscar si ya existe una alerta activa (no leída)
      const q = query(
        collection(db, 'houses', houseId, 'notifications'), 
        where('tipo', '==', 'stock'),
        where('leida', '==', false)
      );
      const notifsSnap = await getDocs(q);
      const exists = notifsSnap.docs.some(d => d.data().titulo.includes(p.nombre));

      if (!exists) {
        const notifRef = doc(collection(db, 'houses', houseId, 'notifications'));
        const stockText = p.stock === 0 ? 'Agotado' : `Quedan ${p.stock} ${p.unit}`;
        await setDoc(notifRef, {
          tipo: 'stock',
          icon: '⚠️',
          titulo: `Stock bajo: ${p.nombre}`,
          msg: `${stockText}. El mínimo configurado es ${p.minStock}.`,
          time: 'Ahora mismo',
          leida: false,
          createdAt: serverTimestamp()
        });
      }
    }
  }

  // Agregar producto manualmente
  async addProduct(houseId, product) {
    const newProductRef = doc(collection(db, 'houses', houseId, 'products'));
    await setDoc(newProductRef, {
      ...product,
      createdAt: serverTimestamp()
    });
  }

  // Saldar deudas
  async saldarDeudas(houseId, balance, payerUid, receiverUid, payerName, receiverName) {
    const batch = writeBatch(db);
    const purchaseRef = doc(collection(db, 'houses', houseId, 'purchases'));
    const notifRef = doc(collection(db, 'houses', houseId, 'notifications'));

    const settlement = {
      fecha: new Date().toLocaleDateString('es-AR'),
      comercio: 'Liquidación de Deuda',
      quien: payerUid, // Guarda el UID de quien saldó
      total: balance,
      isSettlement: true,
      items: [
        {
          nombre: `Pago de deuda neto (${payerName} -> ${receiverName})`,
          qty: 1,
          unit: 'transacción',
          precio: balance,
          consumidores: [payerUid],
          shared: false
        }
      ],
      estado: 'confirmada',
      createdAt: serverTimestamp()
    };

    batch.set(purchaseRef, settlement);

    // Crear notificación
    batch.set(notifRef, {
      tipo: 'deuda',
      icon: '💰',
      titulo: 'Deuda liquidada',
      msg: `${payerName} saldó la deuda de $${Math.round(balance).toLocaleString('es-AR')}.`,
      time: 'Ahora mismo',
      leida: false,
      createdAt: serverTimestamp()
    });

    await batch.commit();
  }

  // Marcar notificaciones como leídas
  async markNotificationsRead(houseId, notifications) {
    const batch = writeBatch(db);
    notifications.forEach(n => {
      if (!n.leida) {
        const notifRef = doc(db, 'houses', houseId, 'notifications', n.id);
        batch.update(notifRef, { leida: true });
      }
    });
    await batch.commit();
  }

  // Guardar Plan Alimentario en Firestore
  async saveMealPlan(houseId, mealPlan) {
    const houseRef = doc(db, 'houses', houseId);
    await updateDoc(houseRef, { mealPlan });
  }

  // Categorizador básico
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
}

export const firebaseDb = new FirebaseDb();
