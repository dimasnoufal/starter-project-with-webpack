import {
  getSavedStories,
  deleteSavedStory,
  clearOfflineQueue,
  getSavedStory,
} from '../../utils/idb-helper';
import { showAlert } from '../../utils/index';

export default class SavedPresenter {
  #view = null;

  constructor({ view }) {
    this.#view = view;
  }

  async loadSaved() {
    this.#view.showLoading();
    const stories = await getSavedStories();
    this.#view.showStories(stories || []);
  }

  async deleteStory(id) {
    await deleteSavedStory(id);
    showAlert('Cerita berhasil dihapus dari tersimpan.', 'success');
    this.#view.onDeleteSuccess(id);
  }

  async clearAll() {
    const stories = await getSavedStories();
    for (const story of stories) {
      await deleteSavedStory(story.id);
    }
    showAlert('Semua cerita tersimpan telah dihapus.', 'success');
    this.#view.onClearAllSuccess();
  }
}
