import AddStoryPresenter from './add-story-presenter';
import { showAlert } from '../../utils/index';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).href,
  iconUrl: new URL('leaflet/dist/images/marker-icon.png', import.meta.url).href,
  shadowUrl: new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).href,
});

export default class AddStoryPage {
  #presenter = null;
  #map = null;
  #locationMarker = null;
  #selectedLat = null;
  #selectedLon = null;
  #stream = null;
  #capturedPhoto = null;

  async render() {
    return `
      <section class="add-story-section container">
        <h1 class="page-title">Tambah Cerita Baru</h1>
        <p class="page-subtitle">Bagikan momen spesial Anda dengan foto dan cerita menarik</p>

        <form id="add-story-form" class="add-story-form" novalidate>

          <!-- Photo Section -->
          <fieldset class="form-fieldset">
            <legend class="fieldset-legend">Foto Cerita</legend>

            <div class="photo-method-tabs" role="tablist" aria-label="Metode upload foto">
              <button type="button" class="tab-btn active" id="tab-upload" role="tab" aria-selected="true" aria-controls="panel-upload">
                Upload File
              </button>
              <button type="button" class="tab-btn" id="tab-camera" role="tab" aria-selected="false" aria-controls="panel-camera">
                Kamera
              </button>
            </div>

            <div id="panel-upload" class="tab-panel" role="tabpanel" aria-labelledby="tab-upload">
              <div class="form-group">
                <label for="photo-file" class="form-label">Pilih Gambar</label>
                <input
                  type="file"
                  id="photo-file"
                  name="photo"
                  class="form-input"
                  accept="image/*"
                  aria-describedby="photo-error"
                />
              </div>
            </div>

            <div id="panel-camera" class="tab-panel hidden" role="tabpanel" aria-labelledby="tab-camera">
              <div class="camera-preview-wrapper">
                <video id="camera-video" class="camera-video" autoplay muted playsinline aria-label="Preview kamera"></video>
                <canvas id="camera-canvas" class="camera-canvas hidden" aria-hidden="true"></canvas>
              </div>
              <div class="camera-controls">
                <button type="button" id="start-camera-btn" class="btn btn-secondary">
                  Aktifkan Kamera
                </button>
                <button type="button" id="capture-btn" class="btn btn-primary hidden">
                  Ambil Foto
                </button>
                <button type="button" id="retake-btn" class="btn btn-secondary hidden">
                  Ulangi
                </button>
              </div>
              <p id="camera-status" class="camera-status" role="status" aria-live="polite"></p>
            </div>

            <div id="photo-preview-wrapper" class="photo-preview-wrapper hidden">
              <img id="photo-preview" class="photo-preview" alt="Preview foto yang akan diunggah" />
            </div>
            <span id="photo-error" class="form-error" role="alert" aria-live="polite"></span>
          </fieldset>

          <!-- Description -->
          <div class="form-group">
            <label for="description" class="form-label">Deskripsi Cerita <span aria-hidden="true">*</span></label>
            <textarea
              id="description"
              name="description"
              class="form-input form-textarea"
              placeholder="Ceritakan pengalaman Anda..."
              rows="4"
              required
              minlength="10"
              aria-describedby="description-error"
            ></textarea>
            <span id="description-error" class="form-error" role="alert" aria-live="polite"></span>
          </div>

          <!-- Location -->
          <fieldset class="form-fieldset">
            <legend class="fieldset-legend">Lokasi (Opsional)</legend>
            <p class="map-hint">Klik pada peta untuk menandai lokasi cerita Anda</p>

            <div
              id="add-story-map"
              class="add-story-map"
              role="region"
              aria-label="Peta pemilihan lokasi"
            ></div>

            <div class="location-info" id="location-info" aria-live="polite">
              <span id="location-display">Belum ada lokasi dipilih</span>
              <button type="button" id="clear-location-btn" class="btn btn-small btn-danger hidden" aria-label="Hapus lokasi yang dipilih">
                Hapus Lokasi
              </button>
            </div>

            <div class="hidden">
              <input type="number" id="lat-input" name="lat" step="any" aria-label="Latitude" />
              <input type="number" id="lon-input" name="lon" step="any" aria-label="Longitude" />
            </div>
          </fieldset>

          <button type="submit" class="btn btn-primary btn-full" id="submit-add-btn">
            Bagikan Cerita
          </button>
        </form>
      </section>
    `;
  }

  async afterRender() {
    this.#presenter = new AddStoryPresenter({ view: this });
    this._initTabs();
    this._initMap();
    this._initCamera();
    this._initFileUpload();
    this._setupForm();
  }

  _initTabs() {
    const tabUpload = document.querySelector('#tab-upload');
    const tabCamera = document.querySelector('#tab-camera');
    const panelUpload = document.querySelector('#panel-upload');
    const panelCamera = document.querySelector('#panel-camera');

    tabUpload.addEventListener('click', () => {
      tabUpload.classList.add('active');
      tabUpload.setAttribute('aria-selected', 'true');
      tabCamera.classList.remove('active');
      tabCamera.setAttribute('aria-selected', 'false');
      panelUpload.classList.remove('hidden');
      panelCamera.classList.add('hidden');
      this._stopCamera();
    });

    tabCamera.addEventListener('click', () => {
      tabCamera.classList.add('active');
      tabCamera.setAttribute('aria-selected', 'true');
      tabUpload.classList.remove('active');
      tabUpload.setAttribute('aria-selected', 'false');
      panelCamera.classList.remove('hidden');
      panelUpload.classList.add('hidden');
    });
  }

  _initMap() {
    this.#map = L.map('add-story-map').setView([-2.548926, 118.0148634], 5);

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

    osmLayer.addTo(this.#map);
    L.control.layers({ 'OpenStreetMap': osmLayer, 'Satelit': satelliteLayer }).addTo(this.#map);

    this.#map.on('click', (e) => {
      const { lat, lng } = e.latlng;
      this._setLocation(lat, lng);
    });
  }

  _setLocation(lat, lon) {
    this.#selectedLat = lat;
    this.#selectedLon = lon;

    document.querySelector('#lat-input').value = lat;
    document.querySelector('#lon-input').value = lon;

    const display = document.querySelector('#location-display');
    const clearBtn = document.querySelector('#clear-location-btn');

    if (display) display.textContent = `Lokasi dipilih: ${lat.toFixed(5)}, ${lon.toFixed(5)}`;
    if (clearBtn) clearBtn.classList.remove('hidden');

    if (this.#locationMarker) {
      this.#locationMarker.setLatLng([lat, lon]);
    } else {
      this.#locationMarker = L.marker([lat, lon]).addTo(this.#map);
      this.#locationMarker.bindPopup('Lokasi cerita Anda').openPopup();
    }

    document.querySelector('#clear-location-btn').addEventListener('click', () => {
      this._clearLocation();
    });
  }

  _clearLocation() {
    this.#selectedLat = null;
    this.#selectedLon = null;
    document.querySelector('#lat-input').value = '';
    document.querySelector('#lon-input').value = '';
    const display = document.querySelector('#location-display');
    if (display) display.textContent = 'Belum ada lokasi dipilih';
    const clearBtn = document.querySelector('#clear-location-btn');
    if (clearBtn) clearBtn.classList.add('hidden');
    if (this.#locationMarker) {
      this.#map.removeLayer(this.#locationMarker);
      this.#locationMarker = null;
    }
  }

  _initCamera() {
    const startBtn = document.querySelector('#start-camera-btn');
    const captureBtn = document.querySelector('#capture-btn');
    const retakeBtn = document.querySelector('#retake-btn');
    const video = document.querySelector('#camera-video');
    const canvas = document.querySelector('#camera-canvas');
    const status = document.querySelector('#camera-status');

    startBtn.addEventListener('click', async () => {
      try {
        status.textContent = 'Mengaktifkan kamera...';
        this.#stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
        video.srcObject = this.#stream;
        video.classList.remove('hidden');
        startBtn.classList.add('hidden');
        captureBtn.classList.remove('hidden');
        status.textContent = 'Kamera aktif. Tekan "Ambil Foto" untuk mengambil gambar.';
      } catch (err) {
        status.textContent = `Tidak dapat mengakses kamera: ${err.message}`;
      }
    });

    captureBtn.addEventListener('click', () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0);

      canvas.toBlob((blob) => {
        this.#capturedPhoto = new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' });
        this._showPhotoPreview(URL.createObjectURL(blob));

        video.classList.add('hidden');
        canvas.classList.remove('hidden');
        captureBtn.classList.add('hidden');
        retakeBtn.classList.remove('hidden');
        status.textContent = 'Foto berhasil diambil.';

        this._stopCamera();
      }, 'image/jpeg', 0.9);
    });

    retakeBtn.addEventListener('click', async () => {
      this.#capturedPhoto = null;
      canvas.classList.add('hidden');
      retakeBtn.classList.add('hidden');
      document.querySelector('#photo-preview-wrapper').classList.add('hidden');

      try {
        this.#stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
        video.srcObject = this.#stream;
        video.classList.remove('hidden');
        captureBtn.classList.remove('hidden');
        status.textContent = 'Kamera aktif kembali.';
      } catch (err) {
        status.textContent = `Tidak dapat mengaktifkan kamera: ${err.message}`;
        startBtn.classList.remove('hidden');
      }
    });
  }

  _stopCamera() {
    if (this.#stream) {
      this.#stream.getTracks().forEach((track) => track.stop());
      this.#stream = null;
    }
  }

  _initFileUpload() {
    const fileInput = document.querySelector('#photo-file');
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        this._showPhotoPreview(URL.createObjectURL(file));
      }
    });
  }

  _showPhotoPreview(url) {
    const wrapper = document.querySelector('#photo-preview-wrapper');
    const img = document.querySelector('#photo-preview');
    img.src = url;
    wrapper.classList.remove('hidden');
  }

  _setupForm() {
    const form = document.querySelector('#add-story-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      this._clearErrors();

      const description = form.description.value.trim();
      const fileInput = document.querySelector('#photo-file');
      const photo = this.#capturedPhoto || (fileInput.files[0] || null);

      let hasError = false;

      if (!photo) {
        this._showFieldError('photo-error', 'Foto tidak boleh kosong.');
        hasError = true;
      }

      if (!description || description.length < 10) {
        this._showFieldError('description-error', 'Deskripsi minimal 10 karakter.');
        hasError = true;
      }

      if (hasError) return;

      this.setSubmitLoading(true);
      await this.#presenter.addStory({
        description,
        photo,
        lat: this.#selectedLat,
        lon: this.#selectedLon,
      });
      this.setSubmitLoading(false);
    });

    // Stop camera when navigating away
    window.addEventListener('hashchange', () => {
      this._stopCamera();
    }, { once: true });
  }

  _showFieldError(id, message) {
    const el = document.querySelector(`#${id}`);
    if (el) el.textContent = message;
  }

  _clearErrors() {
    document.querySelectorAll('.form-error').forEach((el) => (el.textContent = ''));
  }

  setSubmitLoading(loading) {
    const btn = document.querySelector('#submit-add-btn');
    if (!btn) return;
    btn.disabled = loading;
    btn.textContent = loading ? 'Mengirim...' : 'Bagikan Cerita';
  }

  onAddSuccess(message) {
    this._stopCamera();
    showAlert(message || 'Cerita berhasil dibagikan!', 'success');
    setTimeout(() => { window.location.hash = '#/'; }, 800);
  }

  onAddError(message) {
    showAlert(message || 'Gagal mengirim cerita. Silakan coba lagi.', 'error');
  }
}
