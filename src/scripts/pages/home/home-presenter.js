import { getAllStories } from '../../data/api';
import Auth from '../../utils/auth';
import { showAlert } from '../../utils/index';

export default class HomePresenter {
  #view = null;

  constructor({ view }) {
    this.#view = view;
  }

  async loadStories() {
    try {
      if (!Auth.isLoggedIn()) {
        this.#view.showError('Silakan masuk terlebih dahulu untuk melihat cerita.');
        showAlert('Silakan masuk untuk melanjutkan.', 'error');
        setTimeout(() => { window.location.hash = '#/login'; }, 1000);
        return;
      }

      this.#view.showLoading();

      const response = await getAllStories({ location: 1, size: 30 });

      if (response.error) {
        this.#view.showError(response.message);
        return;
      }

      this.#view.showStories(response.listStory || []);
    } catch (err) {
      console.error('loadStories failed', err);
      this.#view.showError('Terjadi kesalahan saat memuat cerita.');
    }
  }
}
