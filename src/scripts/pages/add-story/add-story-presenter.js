import { addStory, addStoryAsGuest } from '../../data/api';
import Auth from '../../utils/auth';
import { addToOfflineQueue } from '../../utils/idb-helper';

export default class AddStoryPresenter {
  #view = null;

  constructor({ view }) {
    this.#view = view;
  }

  async addStory({ description, photo, lat, lon }) {
    // Offline fallback: queue the story to IndexedDB
    if (!navigator.onLine) {
      try {
        const photoBase64 = await this._fileToBase64(photo);
        await addToOfflineQueue({
          description,
          photoBase64,
          photoType: photo.type,
          lat,
          lon,
          isGuest: !Auth.isLoggedIn(),
          token: Auth.getAccessToken(),
          queuedAt: new Date().toISOString(),
        });
        this.#view.onAddSuccess(
          'Anda sedang offline. Cerita disimpan dan akan dikirim otomatis saat online kembali.'
        );
      } catch (err) {
        this.#view.onAddError(`Gagal menyimpan cerita offline: ${err.message}`);
      }
      return;
    }

    let response;

    if (Auth.isLoggedIn()) {
      response = await addStory({ description, photo, lat, lon });
    } else {
      response = await addStoryAsGuest({ description, photo, lat, lon });
    }

    if (response.error) {
      this.#view.onAddError(response.message);
      return;
    }

    this.#view.onAddSuccess(response.message);
  }

  _fileToBase64(file) {
    return new Promise((resolve, reject) => {
      if (!file) return resolve(null);
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Gagal membaca file foto.'));
      reader.readAsDataURL(file);
    });
  }
}
