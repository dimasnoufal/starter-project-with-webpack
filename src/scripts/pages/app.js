import routes from '../routes/routes';
import { getActiveRoute, getActivePathname } from '../routes/url-parser';
import Auth from '../utils/auth';
import {
  subscribePushNotification,
  unsubscribePushNotification,
  getSubscriptionStatus,
  isNotificationSupported,
} from '../utils/notification-helper';
import { showAlert } from '../utils/index';

class App {
  #content = null;
  #drawerButton = null;
  #navigationDrawer = null;

  constructor({ navigationDrawer, drawerButton, content }) {
    this.#content = content;
    this.#drawerButton = drawerButton;
    this.#navigationDrawer = navigationDrawer;

    this._setupDrawer();
    this._updateAuthNav();
    this._setupNotificationButton();
  }

  _setupDrawer() {
    this.#drawerButton.addEventListener('click', () => {
      const isOpen = this.#navigationDrawer.classList.toggle('open');
      this.#drawerButton.setAttribute('aria-expanded', String(isOpen));
    });

    document.body.addEventListener('click', (event) => {
      if (!this.#navigationDrawer.contains(event.target) && !this.#drawerButton.contains(event.target)) {
        this.#navigationDrawer.classList.remove('open');
        this.#drawerButton.setAttribute('aria-expanded', 'false');
      }

      this.#navigationDrawer.querySelectorAll('a').forEach((link) => {
        if (link.contains(event.target)) {
          this.#navigationDrawer.classList.remove('open');
          this.#drawerButton.setAttribute('aria-expanded', 'false');
        }
      });
    });
  }

  _updateAuthNav() {
    const authLink = document.querySelector('#nav-auth-link');
    const authItem = document.querySelector('#nav-auth-item');
    if (!authLink || !authItem) return;

    if (Auth.isLoggedIn()) {
      const user = Auth.getUserInfo();
      authLink.textContent = `Keluar (${user?.name || 'Akun'})`;
      authLink.href = '#';
      authLink.onclick = (e) => {
        e.preventDefault();
        Auth.logout();
        this._updateAuthNav();
        window.location.hash = '#/login';
      };
    } else {
      authLink.textContent = 'Masuk';
      authLink.href = '#/login';
      authLink.onclick = null;
    }
  }

  async _setupNotificationButton() {
    const btn = document.querySelector('#notification-btn');
    if (!btn) return;

    // Check support synchronously first
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      btn.style.display = 'none';
      return;
    }

    const updateBtnState = async (isSubscribed) => {
      btn.innerHTML = isSubscribed ? '🔕' : '🔔';
      btn.setAttribute('aria-label', isSubscribed ? 'Nonaktifkan notifikasi' : 'Aktifkan notifikasi');
      btn.title = isSubscribed ? 'Notifikasi aktif — klik untuk nonaktifkan' : 'Aktifkan notifikasi push';
      btn.classList.toggle('notif-active', isSubscribed);
    };

    // Pasang event listener DULU — jangan tunggu async di atas
    btn.addEventListener('click', async () => {
      if (!Auth.isLoggedIn()) {
        showAlert('Silakan masuk terlebih dahulu untuk mengaktifkan notifikasi.', 'error');
        return;
      }
      btn.disabled = true;
      try {
        const isSubscribed = await getSubscriptionStatus();
        if (isSubscribed) {
          await unsubscribePushNotification();
          await updateBtnState(false);
          showAlert('Notifikasi berhasil dinonaktifkan.', 'success');
        } else {
          await subscribePushNotification();
          await updateBtnState(true);
          showAlert('Notifikasi berhasil diaktifkan!', 'success');
        }
      } catch (err) {
        showAlert(`Notifikasi: ${err.message}`, 'error');
      } finally {
        btn.disabled = false;
      }
    });

    // Update tampilan awal di background (tidak block event listener)
    try {
      const isSubscribed = await getSubscriptionStatus();
      await updateBtnState(isSubscribed);
    } catch (_) {
      // SW belum ready, biarkan default icon
    }
  }

  async renderPage() {
    const url = getActiveRoute();
    const PageClass = routes[url];

    if (!PageClass) {
      this.#content.innerHTML = `
        <section class="container not-found">
          <h1>404 - Halaman Tidak Ditemukan</h1>
          <p>Halaman yang Anda cari tidak ada.</p>
          <a href="#/" class="btn btn-primary">Kembali ke Beranda</a>
        </section>`;
      return;
    }

    const page = new PageClass();

    this._updateAuthNav();

    const doRender = async () => {
      this.#content.innerHTML = await page.render();
      await page.afterRender();
      this.#content.focus();
    };

    if (!document.startViewTransition) {
      await doRender();
    } else {
      const transition = document.startViewTransition(async () => {
        await doRender();
      });
      await transition.finished;
    }
  }
}

export default App;
