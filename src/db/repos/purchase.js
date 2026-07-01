import {
  collection, doc, setDoc, getDoc, getDocs, updateDoc,
  query, orderBy, limit, onSnapshot, writeBatch, serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { computePurchaseDelta, applyDelta } from '../../services/balance';
import { guessCategory } from '../../services/categories';
import { writeAuditEntry } from './audit';

// --- INTERNAL HELPERS ---

async function updateMonthlyBalance(houseId, purchase) {
  try {
    const houseRef = doc(db, 'houses', houseId);
    const houseSnap = await getDoc(houseRef);
    if (!houseSnap.exists()) return;

    const houseData = houseSnap.data();
    const existing = houseData.monthlyBalances || {};

    let fecha = purchase.fecha;
    if (!fecha && purchase.createdAt) {
      const d = purchase.createdAt.toDate ? purchase.createdAt.toDate() : new Date();
      fecha = d.toLocaleDateString('es-AR');
    }
    const yearMonth = fecha ? fecha.split('/').reverse().join('-').slice(0, 7) : new Date().toISOString().slice(0, 7);

    const delta = computePurchaseDelta(purchase);
    if (!delta) return;

    const updated = applyDelta(existing, yearMonth, delta);
    await updateDoc(houseRef, { monthlyBalances: updated });
  } catch (e) {
    console.error('Error updating monthly balance:', e);
  }
}

async function revertBalance(houseId, oldData) {
  const oldDelta = computePurchaseDelta(oldData);
  if (oldDelta) {
    const houseRef = doc(db, 'houses', houseId);
    const houseSnap = await getDoc(houseRef);
    const existing = houseSnap.data()?.monthlyBalances || {};
    const monthKey = oldData.fecha ? oldData.fecha.split('/').reverse().join('-').slice(0, 7) : null;
    if (monthKey) {
      const revert = {};
      Object.entries(oldDelta.byMember).forEach(([uid, v]) => {
        if (!revert[uid]) revert[uid] = { paid: 0, shouldPay: 0, settlementsOut: 0, settlementsIn: 0 };
        revert[uid].paid = -(v.paid || 0);
        revert[uid].shouldPay = -(v.shouldPay || 0);
        revert[uid].settlementsOut = -(v.settlementsOut || 0);
        revert[uid].settlementsIn = -(v.settlementsIn || 0);
      });
      const revertDelta = { totalSpent: -(oldDelta.totalSpent), byMember: revert };
      const updated = applyDelta(existing, monthKey, revertDelta);
      return updateDoc(houseRef, { monthlyBalances: updated });
    }
  }
}

// --- PUBLIC API ---

export function subscribeToPurchases(houseId, callback) {
  const q = query(
    collection(db, 'houses', houseId, 'purchases'),
    orderBy('createdAt', 'desc'),
    limit(50)
  );
  return onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
    if (snapshot.metadata.hasPendingWrites) return;
    const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(list);
  }, (error) => {
    console.error("Error subscribiéndose a compras:", error);
  });
}

export async function addPurchase(houseId, purchase, userMeta) {
  const batch = writeBatch(db);
  const purchaseRef = doc(collection(db, 'houses', houseId, 'purchases'));

  const newPurchase = {
    ...purchase,
    _editedBy: userMeta,
    createdAt: serverTimestamp()
  };

  batch.set(purchaseRef, newPurchase);

  if (purchase.estado === 'confirmada') {
    const productsSnap = await getDocs(collection(db, 'houses', houseId, 'products'));
    const products = productsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    purchase.items.forEach(item => {
      const found = products.find(p => p.nombre.toLowerCase().trim() === item.nombre.toLowerCase().trim());
      if (found) {
        const productRef = doc(db, 'houses', houseId, 'products', found.id);
        const newStock = Math.round((found.stock + item.qty) * 100) / 100;
        batch.update(productRef, { stock: newStock, _editedBy: userMeta });
        const movementRef = doc(collection(db, 'houses', houseId, 'products', found.id, 'stockMovements'));
        batch.set(movementRef, {
          type: 'add',
          amount: item.qty,
          unit: item.unit || 'unidades',
          previousStock: found.stock,
          newStock,
          userId: userMeta?.uid || 'system',
          userName: userMeta?.displayName || 'Sistema',
          source: { type: 'purchase', id: purchaseRef.id },
          timestamp: serverTimestamp()
        });
      } else {
        const newProductRef = doc(collection(db, 'houses', houseId, 'products'));
        batch.set(newProductRef, {
          nombre: item.nombre,
          cat: guessCategory(item.nombre),
          unit: item.unit || 'unidades',
          stock: item.qty,
          minStock: 1,
          consumidores: item.consumidores || ['T', 'S'],
          _editedBy: userMeta,
          createdAt: serverTimestamp()
        });
        const movementRef = doc(collection(db, 'houses', houseId, 'products', newProductRef.id, 'stockMovements'));
        batch.set(movementRef, {
          type: 'add',
          amount: item.qty,
          unit: item.unit || 'unidades',
          previousStock: 0,
          newStock: item.qty,
          userId: userMeta?.uid || 'system',
          userName: userMeta?.displayName || 'Sistema',
          source: { type: 'purchase', id: purchaseRef.id },
          timestamp: serverTimestamp()
        });
      }
    });
  }

  await batch.commit();

  const purchaseName = purchase.comercio || 'compra';
  const purchaseTotal = purchase.total || 0;
  await writeAuditEntry(houseId, {
    action: purchase.estado === 'confirmada' ? 'create' : 'update',
    entityType: 'purchases',
    entityId: purchaseRef.id,
    userId: userMeta?.uid || 'system',
    userName: userMeta?.displayName || 'Sistema',
    summary: `Cargó compra de $${Math.round(purchaseTotal).toLocaleString('es-AR')} en ${purchaseName}`
  });

  await updateMonthlyBalance(houseId, newPurchase);
}

export async function updatePurchase(houseId, purchaseId, data, userMeta) {
  const purchaseRef = doc(db, 'houses', houseId, 'purchases', purchaseId);

  const oldSnap = await getDoc(purchaseRef);
  if (!oldSnap.exists()) throw new Error('Compra no encontrada');
  const oldData = { id: oldSnap.id, ...oldSnap.data() };

  if (data.estado === 'confirmada' && oldData.estado !== 'confirmada') {
    const productsSnap = await getDocs(collection(db, 'houses', houseId, 'products'));
    const products = productsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const batch = writeBatch(db);

    (data.items || oldData.items).forEach(item => {
      const found = products.find(p => p.nombre.toLowerCase().trim() === item.nombre.toLowerCase().trim());
      if (found) {
        const productRef = doc(db, 'houses', houseId, 'products', found.id);
        const newStock = Math.round((found.stock + item.qty) * 100) / 100;
        batch.update(productRef, { stock: newStock, _editedBy: userMeta });
      } else {
        const newProductRef = doc(collection(db, 'houses', houseId, 'products'));
        batch.set(newProductRef, {
          nombre: item.nombre,
          cat: guessCategory(item.nombre),
          unit: item.unit || 'unidades',
          stock: item.qty,
          minStock: 1,
          consumidores: item.consumidores || [],
          _editedBy: userMeta,
          createdAt: serverTimestamp()
        });
      }
    });
    await batch.commit();
  }

  const updateData = {
    ...data,
    _editedBy: userMeta,
    updatedAt: serverTimestamp()
  };

  await updateDoc(purchaseRef, updateData);

  await writeAuditEntry(houseId, {
    action: 'update',
    entityType: 'purchases',
    entityId: purchaseId,
    userId: userMeta?.uid || 'system',
    userName: userMeta?.displayName || 'Sistema',
    summary: `Editó compra en ${data.comercio || oldData.comercio || 'comercio'}`
  });

  const oldDelta = computePurchaseDelta(oldData);
  const existing = (await getDoc(doc(db, 'houses', houseId))).data()?.monthlyBalances || {};
  const oldMonthKey = oldData.fecha ? oldData.fecha.split('/').reverse().join('-').slice(0, 7) : null;
  if (oldMonthKey && oldDelta) {
    const revert = {};
    Object.entries(oldDelta.byMember).forEach(([uid, v]) => {
      if (!revert[uid]) revert[uid] = { paid: 0, shouldPay: 0, settlementsOut: 0, settlementsIn: 0 };
      revert[uid].paid = -(v.paid || 0);
      revert[uid].shouldPay = -(v.shouldPay || 0);
      revert[uid].settlementsOut = -(v.settlementsOut || 0);
      revert[uid].settlementsIn = -(v.settlementsIn || 0);
    });
    const revertDelta = { totalSpent: -(oldDelta.totalSpent), byMember: revert };
    const afterRevert = applyDelta(existing, oldMonthKey, revertDelta);
    const newDelta = computePurchaseDelta({ ...oldData, ...data });
    if (newDelta) {
      const newMonthKey = (data.fecha || oldData.fecha).split('/').reverse().join('-').slice(0, 7);
      const updated = applyDelta(afterRevert, newMonthKey, newDelta);
      await updateDoc(doc(db, 'houses', houseId), { monthlyBalances: updated });
    }
  }
}

export async function deletePurchase(houseId, purchaseId, userMeta) {
  const purchaseRef = doc(db, 'houses', houseId, 'purchases', purchaseId);

  const oldSnap = await getDoc(purchaseRef);
  if (!oldSnap.exists()) throw new Error('Compra no encontrada');
  const oldData = { id: oldSnap.id, ...oldSnap.data() };

  await updateDoc(purchaseRef, {
    estado: 'anulada',
    _editedBy: userMeta,
    updatedAt: serverTimestamp(),
    _deletedAt: serverTimestamp()
  });

  await writeAuditEntry(houseId, {
    action: 'delete',
    entityType: 'purchases',
    entityId: purchaseId,
    userId: userMeta?.uid || 'system',
    userName: userMeta?.displayName || 'Sistema',
    summary: `Anuló compra de $${Math.round(oldData.total || 0).toLocaleString('es-AR')} en ${oldData.comercio || 'comercio'}`
  });

  await revertBalance(houseId, oldData);
}

export async function saldarDeudas(houseId, balance, payerUid, receiverUid, payerName, receiverName, userMeta) {
  const batch = writeBatch(db);
  const purchaseRef = doc(collection(db, 'houses', houseId, 'purchases'));
  const notifRef = doc(collection(db, 'houses', houseId, 'notifications'));

  const settlement = {
    fecha: new Date().toLocaleDateString('es-AR'),
    comercio: 'Liquidación de Deuda',
    quien: payerUid,
    total: balance,
    isSettlement: true,
    items: [{
      nombre: `Pago de deuda neto (${payerName} -> ${receiverName})`,
      qty: 1,
      unit: 'transacción',
      precio: balance,
      consumidores: [payerUid],
      shared: false
    }],
    estado: 'confirmada',
    _editedBy: userMeta,
    createdAt: serverTimestamp()
  };

  batch.set(purchaseRef, settlement);

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

  await writeAuditEntry(houseId, {
    action: 'create',
    entityType: 'settlement',
    entityId: purchaseRef.id,
    userId: userMeta?.uid || 'system',
    userName: userMeta?.displayName || 'Sistema',
    summary: `${payerName} saldó deuda de $${Math.round(balance).toLocaleString('es-AR')}`
  });

  await updateMonthlyBalance(houseId, settlement);
}

export async function getBalances(houseId) {
  const snap = await getDocs(query(collection(db, 'houses', houseId, 'purchases')));
  const purchases = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  let totalPaidT = 0, totalPaidS = 0;
  let totalShouldPayT = 0, totalShouldPayS = 0;
  let settlementT_to_S = 0, settlementS_to_T = 0;

  purchases.forEach(p => {
    if (p.isSettlement) {
      if (p.quien === 'T') settlementT_to_S += p.total;
      else if (p.quien === 'S') settlementS_to_T += p.total;
    } else if (p.estado === 'confirmada') {
      if (p.quien === 'T') totalPaidT += p.total;
      if (p.quien === 'S') totalPaidS += p.total;
      p.items?.forEach(item => {
        const cost = item.precio * item.qty;
        const hasT = item.consumidores?.includes('T');
        const hasS = item.consumidores?.includes('S');
        if (item.shared || (hasT && hasS)) {
          totalShouldPayT += cost / 2;
          totalShouldPayS += cost / 2;
        } else if (hasT) { totalShouldPayT += cost; }
        else if (hasS) { totalShouldPayS += cost; }
      });
    }
  });

  const netBalanceT = (totalPaidT - totalShouldPayT) + (settlementT_to_S - settlementS_to_T);
  return {
    net: {
      fromUser: netBalanceT < 0 ? 'T' : 'S',
      toUser: netBalanceT < 0 ? 'S' : 'T',
      amount: Math.round(Math.abs(netBalanceT) * 100) / 100,
      formattedAmount: `$${Math.round(Math.abs(netBalanceT)).toLocaleString('es-AR')}`
    },
    summary: {
      totalPaidT: Math.round(totalPaidT),
      totalPaidS: Math.round(totalPaidS),
      totalShouldPayT: Math.round(totalShouldPayT),
      totalShouldPayS: Math.round(totalShouldPayS)
    }
  };
}
