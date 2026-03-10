import SavedPresenter from './saved-presenter';
import { showFormattedDate } from '../../utils/index';

export default class SavedPage {
  #presenter = null;
  #allStories = [];

  async render() {
    return `
      <section class="saved-section container">
        <header class="saved-header">
          <div>
            <h1 class="page-title">Cerita Tersimpan</h1>
            <p class="page-subtitle">Koleksi cerita yang telah kamu simpan</p>
          </div>
          <button id="clear-all-btn" class="btn btn-danger btn-small" aria-label="Hapus semua cerita tersimpan">
            Hapus Semua
          </button>
        </header>

        <div class="saved-controls">
          <div class="search-wrapper">
            <label for="search-input" class="sr-only">Cari cerita tersimpan</label>
            <input
              type="search"
              id="search-input"
              class="form-input search-input"
              placeholder="Cari nama atau deskripsi..."
              aria-label="Cari cerita tersimpan"
            />
          </div>

          <div class="sort-wrapper">
            <label for="sort-select" class="form-label">Urutkan:</label>
            <select id="sort-select" class="form-input sort-select" aria-label="Urutan tampilan">
              <option value="saved-desc">Terbaru disimpan</option>
              <option value="saved-asc">Terlama disimpan</option>
              <option value="name-asc">Nama (A-Z)</option>
              <option value="name-desc">Nama (Z-A)</option>
            </select>
          </div>
        </div>

        <div id="saved-list" class="saved-list" role="list" aria-label="Daftar cerita tersimpan"></div>
      </section>
    `;
  }

  async afterRender() {
    this.#presenter = new SavedPresenter({ view: this });
    this._setupControls();
    await this.#presenter.loadSaved();
  }

  _setupControls() {
    const searchInput = document.querySelector('#search-input');
    const sortSelect = document.querySelector('#sort-select');
    const clearAllBtn = document.querySelector('#clear-all-btn');

    searchInput.addEventListener('input', () => this._filterAndSort());
    sortSelect.addEventListener('change', () => this._filterAndSort());

    clearAllBtn.addEventListener('click', async () => {
      if (confirm('Hapus semua cerita tersimpan?')) {
        await this.#presenter.clearAll();
      }
    });
  }

  _filterAndSort() {
    const query = document.querySelector('#search-input').value.toLowerCase().trim();
    const sort = document.querySelector('#sort-select').value;

    let result = [...this.#allStories];

    if (query) {
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          s.description.toLowerCase().includes(query),
      );
    }

    switch (sort) {
      case 'saved-asc':
        result.sort((a, b) => new Date(a.savedAt) - new Date(b.savedAt));
        break;
      case 'name-asc':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name-desc':
        result.sort((a, b) => b.name.localeCompare(a.name));
        break;
      default: // saved-desc
        result.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
    }

    this._renderList(result);
  }

  showStories(stories) {
    this.#allStories = stories;
    this._filterAndSort();
  }

  _renderList(stories) {
    const container = document.querySelector('#saved-list');
    if (!container) return;

    if (!stories || stories.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>Belum ada cerita tersimpan.</p>
          <a href="#/" class="btn btn-primary">Jelajahi Cerita</a>
        </div>`;
      return;
    }

    container.innerHTML = stories.map((story) => this._createCard(story)).join('');

    container.querySelectorAll('.delete-saved-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const id = btn.dataset.storyId;
        this.#presenter.deleteStory(id);
      });
    });
  }

  _createCard(story) {
    return `
      <article class="story-card saved-card" role="listitem" data-story-id="${story.id}">
        <div class="story-card-image-wrapper">
          <img
            src="${story.photoUrl}"
            alt="Foto cerita dari ${story.name}"
            class="story-card-img"
            loading="lazy"
          />
        </div>
        <div class="story-card-body">
          <div class="story-card-meta">
            <span class="story-author">${story.name}</span>
            <time class="story-date" datetime="${story.createdAt}">
              ${showFormattedDate(story.createdAt)}
            </time>
          </div>
          <p class="story-description">${story.description}</p>
          <div class="saved-card-actions">
            <a href="#/stories/${story.id}" class="story-read-more" aria-label="Lihat detail cerita ${story.name}">
              Lihat Detail &rarr;
            </a>
            <button
              class="btn btn-small btn-danger delete-saved-btn"
              data-story-id="${story.id}"
              aria-label="Hapus cerita ${story.name} dari tersimpan"
            >
              Hapus
            </button>
          </div>
          <small class="saved-at">Disimpan: ${showFormattedDate(story.savedAt)}</small>
        </div>
      </article>`;
  }

  showLoading() {
    const container = document.querySelector('#saved-list');
    if (container) {
      container.innerHTML = `
        <div class="loading-container" role="status">
          <div class="loading-spinner" aria-hidden="true"></div>
          <p>Memuat cerita tersimpan...</p>
        </div>`;
    }
  }

  onDeleteSuccess(id) {
    this.#allStories = this.#allStories.filter((s) => s.id !== id);
    this._filterAndSort();
  }

  onClearAllSuccess() {
    this.#allStories = [];
    this._filterAndSort();
  }
}
