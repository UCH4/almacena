import { useState, useEffect, useCallback } from 'react';
import { dbProvider } from '../db/dbProvider';

export function useHouse(user, showToast) {
  const [house, setHouse] = useState(null);
  const [userHouses, setUserHouses] = useState([]);
  const [inviteCode, setInviteCode] = useState(null);

  useEffect(() => {
    if (!user) {
      setHouse(null);
      setUserHouses([]);
      return;
    }

    if (!user.uid) return;

    // En modo local ya seteamos la casa en useAuth, no sobreescribir
    if (user.uid === 'T' && !user.email) {
      const localHouse = {
        id: 'local_house',
        name: 'Casa Tomas (Local)',
        inviteCode: 'LOCAL',
        members: ['T', 'S'],
        membersInfo: { 'T': { name: 'Tomas' }, 'S': { name: 'Hermana' } },
        categories: ['lácteos', 'carnes', 'verduras', 'despensa', 'bebidas', 'limpieza', 'perfumería']
      };
      setHouse(localHouse);
      setUserHouses([localHouse]);
      return;
    }

    const initHouse = async () => {
      try {
        const houses = await dbProvider.getUserHouses(user.uid);
        setUserHouses(houses);

        if (user.activeHouseId) {
          const houseData = houses.find(h => h.id === user.activeHouseId) || await dbProvider.getHouse(user.activeHouseId);
          setHouse(houseData || null);
          if (houseData && (!user.houseIds || !user.houseIds.includes(user.activeHouseId))) {
            const updatedHouseIds = [...(user.houseIds || []), user.activeHouseId];
            await dbProvider.saveUserProfile(user.uid, { houseIds: updatedHouseIds });
          }
        } else if (houses.length > 0) {
          const firstHouse = houses[0];
          setHouse(firstHouse);
          await dbProvider.saveUserProfile(user.uid, { activeHouseId: firstHouse.id });
        } else {
          setHouse(null);
        }
      } catch (e) {
        console.error('Error loading house:', e);
      }
    };

    initHouse();
  }, [user?.uid]);

  const handleCreateHouse = useCallback(async (houseName) => {
    if (!user) return;
    const newHouse = await dbProvider.createHouse(
      user.uid, houseName, user.nickname || user.displayName, user.photoURL, user.emoji
    );
    setHouse(newHouse);
    setInviteCode(newHouse.inviteCode);
    setUserHouses(prev => {
      if (prev.find(h => h.id === newHouse.id)) return prev;
      return [...prev, newHouse];
    });
    showToast(`🏡 Casa "${houseName}" creada. Código: ${newHouse.inviteCode}`, 'success');
  }, [user, showToast]);

  const handleCloseInviteModal = useCallback(() => {
    setInviteCode(null);
  }, []);

  const handleJoinHouse = useCallback(async (code) => {
    if (!user) return;
    try {
      const joinedHouse = await dbProvider.joinHouse(
        user.uid, code, user.nickname || user.displayName, user.photoURL, user.emoji
      );
      setHouse(joinedHouse);
      setUserHouses(prev => {
        if (prev.find(h => h.id === joinedHouse.id)) return prev;
        return [...prev, joinedHouse];
      });
      showToast(`🏡 Te uniste a la casa: ${joinedHouse.name}`, 'success');
    } catch (e) {
      showToast(`❌ ${e.message}`, 'error');
      throw e;
    }
  }, [user, showToast]);

  const handleLeaveHouse = useCallback(async () => {
    if (!user || !house) return;
    try {
      const result = await dbProvider.leaveHouse(house.id, user.uid, user.displayName);
      showToast(result.remainingMembers.length === 0 ? '🏚️ Abandonaste la casa (no quedan miembros)' : '🚪 Saliste de la casa', 'info');
      setHouse(null);
      setUserHouses(prev => prev.filter(h => h.id !== house.id));
    } catch (e) {
      showToast(`❌ Error al salir: ${e.message}`, 'error');
    }
  }, [user, house, showToast]);

  const handleSwitchHouse = useCallback(async (houseId) => {
    if (!user) return;
    try {
      const houseData = await dbProvider.switchHouse(user.uid, houseId);
      setHouse(houseData);
      showToast(`🏠 Cambiaste a: ${houseData.name}`, 'success');
    } catch (e) {
      showToast(`❌ Error al cambiar de casa: ${e.message}`, 'error');
    }
  }, [user, showToast]);

  return {
    house, setHouse, userHouses, inviteCode,
    handleCreateHouse, handleCloseInviteModal, handleJoinHouse,
    handleLeaveHouse, handleSwitchHouse
  };
}
