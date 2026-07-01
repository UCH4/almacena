import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export async function getUserProfile(userId) {
  const docRef = doc(db, 'users', userId);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? docSnap.data() : null;
}

export async function saveUserProfile(userId, data) {
  const docRef = doc(db, 'users', userId);
  await setDoc(docRef, {
    uid: userId,
    updatedAt: serverTimestamp(),
    ...data
  }, { merge: true });
}
