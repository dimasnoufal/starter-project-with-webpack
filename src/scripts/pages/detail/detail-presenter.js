import { getStoryDetail } from '../../data/api';
import { parseActivePathname } from '../../routes/url-parser';
import Auth from '../../utils/auth';
import { showAlert } from '../../utils/index';
import { saveStory, deleteSavedStory, isStorySaved } from '../../utils/idb-helper';

export default class DetailPresenter {
  #view = null;
  #currentStory = null;

  constructor({ view }) {
    this.#view = view;
  }

  async loadDetail() {
    if (!Auth.isLoggedIn()) {
      showAlert('Silakan masuk untuk melihat cerita.', 'error');
      setTimeout(() => { window.location.hash = '#/login'; }, 800);
      return;
    }

    const { id } = parseActivePathname();

    if (!id) {
      this.#view.showError('ID cerita tidak ditemukan.');
      return;
    }

    const response = await getStoryDetail(id);

    if (response.error) {
      this.#view.showError(response.message);
      return;
    }

    await this.#view.showDetail(response.story);
    this.#currentStory = response.story;
  }

  async checkSaved(story) {
    const saved = await isStorySaved(story.id);
    this.#view.setSaveState(saved);
  }

  async toggleSave(story) {
    const saved = await isStorySaved(story.id);
    if (saved) {
      await deleteSavedStory(story.id);
      showAlert('Cerita dihapus dari tersimpan.', 'success');
      this.#view.setSaveState(false);
    } else {
      await saveStory(story);
      showAlert('Cerita berhasil disimpan!', 'success');
      this.#view.setSaveState(true);
    }
  }
}
