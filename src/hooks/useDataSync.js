import { useState, useEffect } from 'react';
import { dbProvider } from '../db/dbProvider';

export function useDataSync(houseId, showToast) {
  const [purchases, setPurchases] = useState([]);
  const [products, setProducts] = useState([]);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!houseId) return;

    showToast('🏡 Cargando datos del hogar...', 'info');

    const unsubHouse = dbProvider.subscribeToHouse(houseId, () => {});
    const unsubPurchases = dbProvider.subscribeToPurchases(houseId, setPurchases);
    const unsubProducts = dbProvider.subscribeToProducts(houseId, setProducts);
    const unsubNotifs = dbProvider.subscribeToNotifications(houseId, setNotifications);

    return () => {
      unsubHouse();
      unsubPurchases();
      unsubProducts();
      unsubNotifs();
    };
  }, [houseId]);

  return { purchases, setPurchases, products, notifications };
}
