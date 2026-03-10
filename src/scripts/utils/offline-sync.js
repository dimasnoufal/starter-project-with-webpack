import { getOfflineQueue, removeFromOfflineQueue } from './idb-helper';
import { addStory } from '../data/api';
import { showAlert } from './index';

/**
 * Sync pending offline story submissions to the API.
 * Called when the app comes back online.
 */
export async function syncOfflineQueue() {
  const queue = await getOfflineQueue();
  if (!queue || queue.length === 0) return;

  let syncedCount = 0;
  let failCount = 0;

  for (const item of queue) {
    try {
      // Reconstruct File from stored base64
      let photo = item.photo;
      if (typeof item.photoBase64 === 'string') {
        const res = await fetch(item.photoBase64);
        const blob = await res.blob();
        photo = new File([blob], item.photoName || 'photo.jpg', { type: blob.type });
      }

      const response = await addStory({
        description: item.description,
        photo,
        lat: item.lat,
        lon: item.lon,
      });

      if (!response.error) {
        await removeFromOfflineQueue(item.id);
        syncedCount++;
      } else {
        failCount++;
      }
    } catch {
      failCount++;
    }
  }

  if (syncedCount > 0) {
    showAlert(`${syncedCount} cerita offline berhasil disinkronkan!`, 'success');
  }
  if (failCount > 0) {
    showAlert(`${failCount} cerita gagal disinkronkan.`, 'error');
  }
}

/**
 * Register online event to auto-sync queue.
 */
export function registerOnlineSync() {
  window.addEventListener('online', async () => {
    showAlert('Koneksi kembali online. Menyinkronkan data...', 'success');
    await syncOfflineQueue();
  });
}
