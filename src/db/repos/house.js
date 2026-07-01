import {
  collection, doc, setDoc, getDoc, updateDoc, onSnapshot, serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { writeAuditEntry } from './audit';
import { saveUserProfile } from './profile';

export async function getHouse(houseId) {
  const docRef = doc(db, 'houses', houseId);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? docSnap.data() : null;
}

export async function getUserHouses(userId) {
  const profileRef = doc(db, 'users', userId);
  const profileSnap = await getDoc(profileRef);
  const profile = profileSnap.exists() ? profileSnap.data() : {};
  const houseIds = profile.houseIds || [];
  const houses = [];
  for (const id of houseIds) {
    const houseData = await getHouse(id);
    if (houseData) houses.push({ id, ...houseData });
  }
  return houses;
}

export async function switchHouse(userId, houseId) {
  const houseData = await getHouse(houseId);
  if (!houseData) throw new Error('La casa no existe.');
  if (!houseData.members.includes(userId)) throw new Error('No sos miembro de esta casa.');
  await saveUserProfile(userId, { activeHouseId: houseId });
  return { id: houseId, ...houseData };
}

export async function createHouse(userId, houseName, userName, userPhoto = '', userEmoji = '') {
  const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  const houseRef = doc(collection(db, 'houses'));
  const houseId = houseRef.id;

  const memberInfo = { name: userName, photo: userPhoto };
  if (userEmoji) memberInfo.emoji = userEmoji;

  const houseData = {
    id: houseId,
    name: houseName,
    inviteCode,
    owner: userId,
    members: [userId],
    membersInfo: { [userId]: memberInfo },
    categories: ['lácteos', 'carnes', 'verduras', 'despensa', 'bebidas', 'limpieza', 'perfumería'],
    createdAt: serverTimestamp()
  };

  await setDoc(houseRef, houseData);

  const inviteRef = doc(db, 'inviteCodes', inviteCode);
  await setDoc(inviteRef, {
    houseId,
    houseName,
    createdAt: serverTimestamp()
  });

  const profileRef = doc(db, 'users', userId);
  const profileSnap = await getDoc(profileRef);
  const existingProfile = profileSnap.exists() ? profileSnap.data() : {};
  const existingHouseIds = existingProfile.houseIds || [];
  const updatedHouseIds = existingHouseIds.includes(houseId) ? existingHouseIds : [...existingHouseIds, houseId];
  await setDoc(profileRef, {
    activeHouseId: houseId,
    houseIds: updatedHouseIds,
    updatedAt: serverTimestamp()
  }, { merge: true });

  await writeAuditEntry(houseId, {
    action: 'create',
    entityType: 'house',
    entityId: houseId,
    userId,
    userName: userName || 'Usuario',
    summary: `Creó el hogar "${houseName}"`
  });

  return houseData;
}

export async function joinHouse(userId, inviteCodeStr, userName, userPhoto = '', userEmoji = '') {
  const code = inviteCodeStr.toUpperCase().trim();
  const inviteRef = doc(db, 'inviteCodes', code);
  const inviteSnap = await getDoc(inviteRef);

  if (!inviteSnap.exists()) {
    throw new Error('Código de invitación inválido.');
  }

  const { houseId } = inviteSnap.data();
  const houseRef = doc(db, 'houses', houseId);
  const houseSnap = await getDoc(houseRef);
  if (!houseSnap.exists()) {
    throw new Error('El hogar asociado a este código ya no existe.');
  }
  const houseData = houseSnap.data();

  const memberInfo = { name: userName, photo: userPhoto };
  if (userEmoji) memberInfo.emoji = userEmoji;

  if (houseData.members.includes(userId)) {
    const profileRef = doc(db, 'users', userId);
    const profileSnap = await getDoc(profileRef);
    const existingProfile = profileSnap.exists() ? profileSnap.data() : {};
    const existingHouseIds = existingProfile.houseIds || [];
    const updatedHouseIds = existingHouseIds.includes(houseId) ? existingHouseIds : [...existingHouseIds, houseId];
    await setDoc(profileRef, {
      activeHouseId: houseId,
      houseIds: updatedHouseIds,
      updatedAt: serverTimestamp()
    }, { merge: true });
    return houseData;
  }

  const updatedMembers = [...houseData.members, userId];
  const updatedMembersInfo = {
    ...houseData.membersInfo,
    [userId]: memberInfo
  };

  await updateDoc(houseRef, {
    members: updatedMembers,
    membersInfo: updatedMembersInfo,
    inviteCode: houseData.inviteCode
  });

  const profileRef = doc(db, 'users', userId);
  const profileSnap = await getDoc(profileRef);
  const existingProfile = profileSnap.exists() ? profileSnap.data() : {};
  const existingHouseIds = existingProfile.houseIds || [];
  const updatedHouseIds = existingHouseIds.includes(houseId) ? existingHouseIds : [...existingHouseIds, houseId];
  await setDoc(profileRef, {
    activeHouseId: houseId,
    houseIds: updatedHouseIds,
    updatedAt: serverTimestamp()
  }, { merge: true });

  await writeAuditEntry(houseId, {
    action: 'update',
    entityType: 'house',
    entityId: houseId,
    userId,
    userName: userName || 'Usuario',
    summary: `${userName} se unió al hogar`
  });

  return { ...houseData, members: updatedMembers, membersInfo: updatedMembersInfo };
}

export async function updateHouseCategories(houseId, categories) {
  const houseRef = doc(db, 'houses', houseId);
  await updateDoc(houseRef, { categories });
  await writeAuditEntry(houseId, {
    action: 'update',
    entityType: 'house',
    entityId: houseId,
    userId: 'system',
    userName: 'Sistema',
    summary: 'Actualizó las categorías del hogar'
  });
}

export async function updateMemberInfo(houseId, userId, data) {
  const houseRef = doc(db, 'houses', houseId);
  const updatePath = {};
  if (data.nickname) {
    updatePath[`membersInfo.${userId}.nickname`] = data.nickname;
    updatePath[`membersInfo.${userId}.name`] = data.nickname;
  }
  if (data.emoji) updatePath[`membersInfo.${userId}.emoji`] = data.emoji;
  if (Object.keys(updatePath).length === 0) return;
  await updateDoc(houseRef, updatePath);
}

export async function leaveHouse(houseId, userId, userName) {
  const houseRef = doc(db, 'houses', houseId);
  const houseSnap = await getDoc(houseRef);
  if (!houseSnap.exists()) throw new Error('La casa no existe.');

  const houseData = houseSnap.data();
  if (!houseData.members.includes(userId)) throw new Error('No sos miembro de esta casa.');

  const updatedMembers = houseData.members.filter(uid => uid !== userId);
  const updatedMembersInfo = { ...houseData.membersInfo };
  delete updatedMembersInfo[userId];

  const updateData = { members: updatedMembers, membersInfo: updatedMembersInfo };
  if (houseData.owner === userId && updatedMembers.length > 0) {
    updateData.owner = updatedMembers[0];
  }

  await updateDoc(houseRef, updateData);

  const profileRef = doc(db, 'users', userId);
  const profileSnap = await getDoc(profileRef);
  const profile = profileSnap.exists() ? profileSnap.data() : {};
  const existingHouseIds = profile.houseIds || [];
  const updatedHouseIds = existingHouseIds.filter(id => id !== houseId);
  const activeHouseId = profile.activeHouseId === houseId ? (updatedHouseIds[0] || null) : profile.activeHouseId;
  await saveUserProfile(userId, { activeHouseId, houseIds: updatedHouseIds });

  await writeAuditEntry(houseId, {
    action: 'leave',
    entityType: 'house',
    entityId: houseId,
    userId,
    userName: userName || 'Usuario',
    summary: `${userName} abandonó el hogar`
  });

  return { left: true, remainingMembers: updatedMembers, activeHouseId };
}

export async function updateHouseSheetUrl(houseId, sheetUrl) {
  const houseRef = doc(db, 'houses', houseId);
  await updateDoc(houseRef, { sheetUrl });
}

export async function updateHouseWebhookUrl(houseId, webhookUrl) {
  const houseRef = doc(db, 'houses', houseId);
  await updateDoc(houseRef, { webhookUrl });
}

export async function syncToWebhook(houseId, data) {
  const house = await getHouse(houseId);
  if (!house?.webhookUrl) throw new Error('No hay webhook configurado');
  const response = await fetch(house.webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...data, timestamp: new Date().toISOString(), houseId })
  });
  if (!response.ok) throw new Error(`Webhook responded with ${response.status}`);
  return response.json();
}

export function subscribeToHouse(houseId, callback) {
  return onSnapshot(doc(db, 'houses', houseId), { includeMetadataChanges: true }, (snap) => {
    if (snap.metadata.hasPendingWrites) return;
    if (snap.exists()) {
      const data = { id: snap.id, ...snap.data() };
      callback(data);
    }
  }, (error) => {
    console.error("Error subscribiéndose a hogar:", error);
  });
}
