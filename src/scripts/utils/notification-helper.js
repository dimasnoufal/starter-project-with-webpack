import CONFIG from '../config';

const VAPID_PUBLIC_KEY = 'BCCs2eonMI-6H2ctvFaWg-UYdDv387Vno_bzUzALpB442r2lCnsHmtrx8biyPi_E-1fSGABK_Qs_GlvPoJJqxbk';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function isNotificationSupported() {
  return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
}

async function getReadySW(timeoutMs = 5000) {
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Service worker timeout')), timeoutMs)
    ),
  ]);
}

export async function getSubscriptionStatus() {
  if (!(await isNotificationSupported())) return false;
  try {
    const registration = await getReadySW();
    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
  } catch (_) {
    return false;
  }
}

export async function subscribePushNotification() {
  if (!(await isNotificationSupported())) {
    throw new Error('Push Notification tidak didukung di browser ini.');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Izin notifikasi ditolak.');
  }

  const registration = await getReadySW();
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }

  // Send subscription to server
  const token = localStorage.getItem(CONFIG.TOKEN_KEY);
  if (!token) throw new Error('Silakan login terlebih dahulu.');

  const { endpoint, keys } = subscription.toJSON();

  const response = await fetch(`${CONFIG.BASE_URL}/notifications/subscribe`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ endpoint, keys }),
  });

  const result = await response.json();
  if (result.error) throw new Error(result.message);

  return subscription;
}

export async function unsubscribePushNotification() {
  if (!(await isNotificationSupported())) return;

  const registration = await getReadySW();
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;

  const token = localStorage.getItem(CONFIG.TOKEN_KEY);
  if (token) {
    await fetch(`${CONFIG.BASE_URL}/notifications/subscribe`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    }).catch(() => {});
  }

  await subscription.unsubscribe();
}
