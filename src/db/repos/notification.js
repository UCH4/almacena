import {
  collection, doc, setDoc, updateDoc, getDoc,
  query, where, orderBy, limit, onSnapshot, writeBatch, serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { writeAuditEntry } from './audit';

export function subscribeToNotifications(houseId, callback) {
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

export function subscribeToAuditLog(houseId, callback) {
  const q = query(
    collection(db, 'houses', houseId, 'auditLog'),
    orderBy('timestamp', 'desc'),
    limit(100)
  );
  return onSnapshot(q, (snapshot) => {
    const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(list);
  }, (error) => {
    console.error("Error subscribiéndose a auditoría:", error);
  });
}

export async function markNotificationsRead(houseId, notifications, userMeta) {
  const batch = writeBatch(db);
  const unreadCount = notifications.filter(n => !n.leida).length;
  notifications.forEach(n => {
    if (!n.leida) {
      const notifRef = doc(db, 'houses', houseId, 'notifications', n.id);
      batch.update(notifRef, { leida: true });
    }
  });
  await batch.commit();

  if (unreadCount > 0) {
    await writeAuditEntry(houseId, {
      action: 'update',
      entityType: 'notifications',
      entityId: 'batch',
      userId: userMeta?.uid || 'system',
      userName: userMeta?.displayName || 'Sistema',
      summary: `Marcó ${unreadCount} notificaciones como leídas`
    });
  }
}

export async function savePushSubscription(houseId, userId, subscription) {
  try {
    const subRef = doc(db, 'houses', houseId, 'pushSubscriptions', userId);
    await setDoc(subRef, {
      subscription,
      userId,
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (e) {
    console.error('Error guardando subscripción push:', e);
  }
}

export async function saveMealPlan(houseId, mealPlan) {
  const houseRef = doc(db, 'houses', houseId);
  await updateDoc(houseRef, { mealPlan });
}

export async function checkAndCreateStockAlert(houseId, productId) {
  const productRef = doc(db, 'houses', houseId, 'products', productId);
  const pSnap = await getDoc(productRef);
  if (!pSnap.exists()) return;
  const p = pSnap.data();

  if (p.stock <= p.minStock) {
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
