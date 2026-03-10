import HomePresenter from './home-presenter';
import { showFormattedDate, showLoading } from '../../utils/index';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix leaflet default icon path issue with webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).href,
  iconUrl: new URL('leaflet/dist/images/marker-icon.png', import.meta.url).href,
  shadowUrl: new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).href,
});

export default class HomePage {
  #presenter = null;
  #map = null;
  #markers = {};
  #activeMarkerId = null;

  async render() {
    return `
      <section class="home-section">
        <div class="container">
          <h1 class="page-title">Cerita Terbaru</h1>
          <p class="page-subtitle">Temukan dan nikmati cerita inspiratif dari seluruh dunia</p>
        </div>

        <div class="home-layout">
          <div class="stories-panel" id="stories-list-container">
            <div class="stories-list" id="stories-list" role="list" aria-label="Daftar cerita"></div>
          </div>

          <aside class="map-panel">
            <h2 class="map-heading">Peta Lokasi Cerita</h2>
            <div
              id="story-map"
              class="story-map"
              role="region"
              aria-label="Peta lokasi cerita"
            ></div>
          </aside>
        </div>
      </section>
    `;
  }

  async afterRender() {
    this.#presenter = new HomePresenter({ view: this });
    this._initMap();
    await this.#presenter.loadStories();
  }

  _initMap() {
    this.#map = L.map('story-map').setView([-2.548926, 118.0148634], 5);

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
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
        maxZoom: 18,
      },
    );

    const topoLayer = L.tileLayer(
      'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
      {
        attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
        maxZoom: 17,
      },
    );

    osmLayer.addTo(this.#map);

    const baseLayers = {
      'OpenStreetMap': osmLayer,
      'Satelit': satelliteLayer,
      'Topografi': topoLayer,
    };

    L.control.layers(baseLayers).addTo(this.#map);
  }

  showStories(stories) {
    const container = document.querySelector('#stories-list-container');
    if (!container) return;

    if (!stories || stories.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>Belum ada cerita. <a href="#/add">Jadilah yang pertama berbagi!</a></p>
        </div>`;
      return;
    }

    container.innerHTML = `<div class="stories-list" role="list" aria-label="Daftar cerita">${stories.map((story) => this._createStoryCard(story)).join('')}</div>`;

    const storiesList = container.querySelector('.stories-list');

    // Add markers to map
    stories.forEach((story) => {
      if (story.lat && story.lon) {
        const marker = L.marker([story.lat, story.lon]).addTo(this.#map);
        marker.bindPopup(`
          <div class="map-popup">
            <strong>${story.name}</strong><br/>
            <img src="${story.photoUrl}" alt="Foto cerita ${story.name}" class="popup-img" /><br/>
            <span>${story.description.substring(0, 80)}${story.description.length > 80 ? '...' : ''}</span><br/>
            <a href="#/stories/${story.id}" class="popup-link">Lihat detail</a>
          </div>`);
        this.#markers[story.id] = marker;

        marker.on('click', () => {
          this._highlightStoryCard(story.id);
        });
      }
    });

    // Sync list click to map
    container.querySelectorAll('.story-card').forEach((card) => {
      card.addEventListener('click', (e) => {
        if (e.target.tagName === 'A') return;
        const id = card.dataset.storyId;
        const marker = this.#markers[id];
        if (marker) {
          this.#map.setView(marker.getLatLng(), 12, { animate: true });
          marker.openPopup();
          this._highlightActiveMarker(id);
        }
      });

      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          card.click();
        }
      });
    });
  }

  _highlightStoryCard(storyId) {
    document.querySelectorAll('.story-card').forEach((c) => c.classList.remove('active'));
    const card = document.querySelector(`.story-card[data-story-id="${storyId}"]`);
    if (card) {
      card.classList.add('active');
      card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  _highlightActiveMarker(storyId) {
    if (this.#activeMarkerId && this.#markers[this.#activeMarkerId]) {
      this.#markers[this.#activeMarkerId].setIcon(new L.Icon.Default());
    }
    this.#activeMarkerId = storyId;

    const activeIcon = new L.Icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });

    if (this.#markers[storyId]) {
      this.#markers[storyId].setIcon(activeIcon);
    }
  }

  _createStoryCard(story) {
    return `
      <article
        class="story-card"
        data-story-id="${story.id}"
        role="listitem"
        tabindex="0"
        aria-label="Cerita dari ${story.name}: ${story.description.substring(0, 50)}"
      >
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
          ${story.lat && story.lon ? '<span class="story-has-location">\uD83D\uDCCD Ada lokasi</span>' : ''}
          <a href="#/stories/${story.id}" class="story-read-more" aria-label="Baca cerita selengkapnya dari ${story.name}">Lihat detail &rarr;</a>
        </div>
      </article>`;
  }

  showLoading() {
    const container = document.querySelector('#stories-list-container');
    if (container) {
      container.innerHTML = `
        <div class="loading-container" role="status" aria-label="Memuat data...">
          <div class="loading-spinner" aria-hidden="true"></div>
          <p>Memuat data...</p>
        </div>`;
    }
  }

  showError(message) {
    const container = document.querySelector('#stories-list-container');
    if (!container) return;
    container.innerHTML = `
      <div class="error-state" role="alert">
        <p>${message || 'Gagal memuat cerita. Silakan coba lagi.'}</p>
        <button class="btn btn-primary" onclick="window.location.reload()">Coba Lagi</button>
      </div>`;
  }
}
