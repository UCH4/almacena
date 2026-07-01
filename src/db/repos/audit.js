import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export async function writeAuditEntry(houseId, entry) {
  const auditRef = doc(collection(db, 'houses', houseId, 'auditLog'));
  await setDoc(auditRef, {
    ...entry,
    timestamp: serverTimestamp()
  });
}
