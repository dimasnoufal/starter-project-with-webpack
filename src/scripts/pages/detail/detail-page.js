import DetailPresenter from './detail-presenter';
import { showFormattedDate, showAlert } from '../../utils/index';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).href,
  iconUrl: new URL('leaflet/dist/images/marker-icon.png', import.meta.url).href,
  shadowUrl: new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).href,
});

export default class DetailPage {
  #presenter = null;

  async render() {
    return `
      <section class="detail-section container" id="detail-content">
        <div class="loading-container" role="status" aria-label="Memuat cerita...">
          <div class="loading-spinner" aria-hidden="true"></div>
          <p>Memuat cerita...</p>
        </div>
      </section>
    `;
  }

  async afterRender() {
    this.#presenter = new DetailPresenter({ view: this });
    await this.#presenter.loadDetail();
  }

  async showDetail(story) {
    const container = document.querySelector('#detail-content');
    if (!container) return;

    container.innerHTML = `
      <a href="#/" class="back-link" aria-label="Kembali ke beranda">&larr; Kembali ke Beranda</a>

      <article class="detail-article">
        <header class="detail-header">
          <h1 class="detail-title">Cerita dari ${story.name}</h1>
          <div class="detail-meta">
            <span class="detail-author">Oleh: <strong>${story.name}</strong></span>
            <time class="detail-date" datetime="${story.createdAt}">
              ${showFormattedDate(story.createdAt)}
            </time>
          </div>
        </header>

        <figure class="detail-figure">
          <img
            src="${story.photoUrl}"
            alt="Foto cerita dari ${story.name}"
            class="detail-photo"
          />
          <figcaption class="detail-description">${story.description}</figcaption>
        </figure>

        <div class="detail-actions">
          <button id="save-btn" class="btn btn-secondary" aria-label="Simpan cerita ini">
            &#9825; Simpan
          </button>
        </div>

        ${story.lat && story.lon ? `
          <section class="detail-map-section" aria-labelledby="map-heading">
            <h2 id="map-heading" class="detail-map-heading">Lokasi Cerita</h2>
            <div
              id="detail-map"
              class="detail-map"
              role="region"
              aria-label="Peta lokasi cerita"
            ></div>
            <p class="detail-coordinates">
              Koordinat: ${story.lat.toFixed(5)}, ${story.lon.toFixed(5)}
            </p>
          </section>
        ` : ''}
      </article>
    `;

    if (story.lat && story.lon) {
      this._initDetailMap(story);
    }

    // Setup save button
    await this.#presenter.checkSaved(story);
    document.querySelector('#save-btn').addEventListener('click', () => {
      this.#presenter.toggleSave(story);
    });
  }

  setSaveState(isSaved) {
    const btn = document.querySelector('#save-btn');
    if (!btn) return;
    btn.innerHTML = isSaved ? '&#9829; Tersimpan' : '&#9825; Simpan';
    btn.classList.toggle('btn-primary', isSaved);
    btn.classList.toggle('btn-secondary', !isSaved);
    btn.setAttribute('aria-label', isSaved ? 'Hapus dari tersimpan' : 'Simpan cerita ini');
  }

  _initDetailMap(story) {
    const map = L.map('detail-map').setView([story.lat, story.lon], 13);

    const osmLayer = L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      },
    );

    const satelliteLayer = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: 'Tiles &copy; Esri',
        maxZoom: 18,
      },
    );

    osmLayer.addTo(map);
    L.control.layers({ 'OpenStreetMap': osmLayer, 'Satelit': satelliteLayer }).addTo(map);

    const marker = L.marker([story.lat, story.lon]).addTo(map);
    marker.bindPopup(`<strong>${story.name}</strong><br/>${story.description.substring(0, 80)}...`).openPopup();
  }

  showError(message) {
    const container = document.querySelector('#detail-content');
    if (!container) return;
    container.innerHTML = `
      <div class="error-state" role="alert">
        <h1>Cerita Tidak Ditemukan</h1>
        <p>${message || 'Cerita yang Anda cari tidak ada atau telah dihapus.'}</p>
        <a href="#/" class="btn btn-primary">Kembali ke Beranda</a>
      </div>`;
  }
}
