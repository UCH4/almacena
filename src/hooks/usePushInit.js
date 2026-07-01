import { useEffect } from 'react';
import { subscribeUser, saveSubscriptionToFirestore } from '../services/pushNotifications';
import { dbProvider } from '../db/dbProvider';

export function usePushInit(houseId, userId) {
  useEffect(() => {
    if (!houseId || !userId) return;
    if (Notification.permission !== 'granted') return;

    const initPush = async () => {
      const subscription = await subscribeUser();
      if (subscription) {
        await saveSubscriptionToFirestore(subscription, dbProvider, houseId, userId);
      }
    };

    const timer = setTimeout(initPush, 3000);
    return () => clearTimeout(timer);
  }, [houseId, userId]);
}
