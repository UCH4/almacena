const VAPID_PUBLIC_KEY = 'BE7SWh5rK8HZVQuxiyCmcRjeY3FCSackkJBx3ggR1fR9YSfo3T0GQ0dndGl7gQj7OGfygYdT2Go7ibUjhgkPrl8';
const PUSH_WORKER_URL = import.meta.env.VITE_PUSH_WORKER_URL || '';

export async function requestPermission() {
  if (!('Notification' in window)) return 'denied';
  const result = await Notification.requestPermission();
  return result;
}

export async function subscribeUser() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null;

  const registration = await navigator.serviceWorker.ready;

  const existingSubscription = await registration.pushManager.getSubscription();
  if (existingSubscription) return existingSubscription;

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
  });

  return subscription;
}

export async function unsubscribeUser() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (subscription) await subscription.unsubscribe();
}

export async function saveSubscriptionToFirestore(subscription, dbProvider, houseId, userId) {
  if (!dbProvider || !houseId || !userId) return;
  try {
    const { firebaseDb } = await import('../db/firebaseDb');
    await firebaseDb.savePushSubscription(houseId, userId, JSON.parse(JSON.stringify(subscription)));
  } catch (e) {
    console.error('Error guardando subscripción push:', e);
  }
}

export async function sendTestPush(subscription) {
  if (!PUSH_WORKER_URL) {
    console.warn('VITE_PUSH_WORKER_URL no configurado');
    return;
  }
  try {
    await fetch(PUSH_WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription,
        title: '🔔 AlacenaApp',
        body: 'Notificaciones push activadas correctamente',
        url: '/'
      })
    });
  } catch (e) {
    console.error('Error enviando push de prueba:', e);
  }
}

export async function triggerLocalNotification(title, body, tag) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const registration = await navigator.serviceWorker.ready;
  registration.showNotification(title, {
    body,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: tag || 'alacena',
    vibrate: [200, 100, 200],
    requireInteraction: true
  });
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) output[i] = rawData.charCodeAt(i);
  return output;
}
