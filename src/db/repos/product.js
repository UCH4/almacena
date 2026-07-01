import {
  collection, doc, setDoc, getDoc, getDocs, updateDoc,
  query, onSnapshot, runTransaction, writeBatch, serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { guessCategory } from '../../services/categories';
import { writeAuditEntry } from './audit';
import { checkAndCreateStockAlert } from './notification';

export function subscribeToProducts(houseId, callback) {
  const q = query(collection(db, 'houses', houseId, 'products'));
  return onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
    if (snapshot.metadata.hasPendingWrites) return;
    const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(list.filter(p => !p._deleted));
  }, (error) => {
    console.error("Error subscribiéndose a stock:", error);
  });
}

export async function consumeProduct(houseId, productId, amount, userMeta) {
  const productRef = doc(db, 'houses', houseId, 'products', productId);
  let pName = 'producto';

  await runTransaction(db, async (transaction) => {
    const sfDoc = await transaction.get(productRef);
    if (!sfDoc.exists()) {
      throw new Error("El producto no existe.");
    }

    const currentStock = sfDoc.data().stock;
    const newStock = Math.max(0, Math.round((currentStock - amount) * 100) / 100);
    pName = sfDoc.data().nombre || pName;

    transaction.update(productRef, { stock: newStock, _editedBy: userMeta });

    const movementRef = doc(collection(db, 'houses', houseId, 'products', productId, 'stockMovements'));
    transaction.set(movementRef, {
      type: 'consume',
      amount,
      unit: sfDoc.data().unit || 'unidades',
      previousStock: currentStock,
      newStock,
      userId: userMeta?.uid || 'system',
      userName: userMeta?.displayName || 'Sistema',
      source: { type: 'manual', id: null },
      timestamp: serverTimestamp()
    });
  });

  await writeAuditEntry(houseId, {
    action: 'update',
    entityType: 'products',
    entityId: productId,
    userId: userMeta?.uid || 'system',
    userName: userMeta?.displayName || 'Sistema',
    summary: `Consumió ${amount} de "${pName}"`
  });

  setTimeout(() => checkAndCreateStockAlert(houseId, productId), 1000);
}

export async function consumeMultipleProducts(houseId, consumptions, userMeta) {
  const batch = writeBatch(db);

  for (const c of consumptions) {
    const productRef = doc(db, 'houses', houseId, 'products', c.id);
    const sfDoc = await getDoc(productRef);
    if (sfDoc.exists()) {
      const currentStock = sfDoc.data().stock;
      const newStock = Math.max(0, Math.round((currentStock - c.amount) * 100) / 100);
      batch.update(productRef, { stock: newStock, _editedBy: userMeta });
      const movementRef = doc(collection(db, 'houses', houseId, 'products', c.id, 'stockMovements'));
      batch.set(movementRef, {
        type: 'consume',
        amount: c.amount,
        unit: sfDoc.data().unit || 'unidades',
        previousStock: currentStock,
        newStock,
        userId: userMeta?.uid || 'system',
        userName: userMeta?.displayName || 'Sistema',
        source: { type: 'recipe', id: c.sourceId || null },
        timestamp: serverTimestamp()
      });
    }
  }

  await batch.commit();

  await writeAuditEntry(houseId, {
    action: 'update',
    entityType: 'products',
    entityId: 'multi',
    userId: userMeta?.uid || 'system',
    userName: userMeta?.displayName || 'Sistema',
    summary: `Cocinó y consumió ${consumptions.length} ingredientes del stock`
  });

  consumptions.forEach(c => {
    setTimeout(() => checkAndCreateStockAlert(houseId, c.id), 1000);
  });
}

export async function addProduct(houseId, product, userMeta) {
  const newProductRef = doc(collection(db, 'houses', houseId, 'products'));
  const stock = product.stock || 0;

  await setDoc(newProductRef, {
    ...product,
    stock,
    _editedBy: userMeta,
    createdAt: serverTimestamp()
  });

  const movementRef = doc(collection(db, 'houses', houseId, 'products', newProductRef.id, 'stockMovements'));
  await setDoc(movementRef, {
    type: 'add',
    amount: stock,
    unit: product.unit || 'unidades',
    previousStock: 0,
    newStock: stock,
    userId: userMeta?.uid || 'system',
    userName: userMeta?.displayName || 'Sistema',
    source: { type: 'manual', id: null },
    timestamp: serverTimestamp()
  });

  await writeAuditEntry(houseId, {
    action: 'create',
    entityType: 'products',
    entityId: newProductRef.id,
    userId: userMeta?.uid || 'system',
    userName: userMeta?.displayName || 'Sistema',
    summary: `Agregó "${product.nombre}" al stock`
  });
}

export async function updateProduct(houseId, productId, data, userMeta) {
  const productRef = doc(db, 'houses', houseId, 'products', productId);
  await updateDoc(productRef, {
    ...data,
    _editedBy: userMeta,
    updatedAt: serverTimestamp()
  });
  await writeAuditEntry(houseId, {
    action: 'update',
    entityType: 'products',
    entityId: productId,
    userId: userMeta?.uid || 'system',
    userName: userMeta?.displayName || 'Sistema',
    summary: `Editó producto "${data.nombre || 'sin nombre'}"`
  });
}

export async function deleteProduct(houseId, productId, userMeta) {
  const productRef = doc(db, 'houses', houseId, 'products', productId);
  const snap = await getDoc(productRef);
  const name = snap.exists() ? snap.data().nombre : 'producto';
  await updateDoc(productRef, {
    _deleted: true,
    _editedBy: userMeta,
    updatedAt: serverTimestamp(),
    _deletedAt: serverTimestamp()
  });
  await writeAuditEntry(houseId, {
    action: 'delete',
    entityType: 'products',
    entityId: productId,
    userId: userMeta?.uid || 'system',
    userName: userMeta?.displayName || 'Sistema',
    summary: `Eliminó producto "${name}" del stock`
  });
}
